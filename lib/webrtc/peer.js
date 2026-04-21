/**
 * VoidDrop — RTCPeerConnection Setup
 * Manages ICE configuration, candidate queuing, and DataChannel lifecycle.
 */

const ICE_SERVERS = [
  // Google STUN
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  // Cloudflare STUN
  { urls: 'stun:stun.cloudflare.com:3478' },
  // Free TURN via Open Relay (works across NATs/firewalls)
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

export function createPeerConnection(onICECandidate, onDataChannel, onConnectionStateChange) {
  const pc = new RTCPeerConnection({
    iceServers: ICE_SERVERS,
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
  });

  // Queue ICE candidates that arrive before remoteDescription is set
  let pendingCandidates = [];
  let remoteDescSet = false;

  pc._flushCandidates = async () => {
    remoteDescSet = true;
    for (const c of pendingCandidates) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
    }
    pendingCandidates = [];
  };

  pc._queueCandidate = async (candidate) => {
    if (remoteDescSet) {
      try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
    } else {
      pendingCandidates.push(candidate);
    }
  };

  pc.onicecandidate = (event) => {
    if (event.candidate) onICECandidate?.(event.candidate);
  };

  pc.ondatachannel = (event) => {
    onDataChannel?.(event.channel);
  };

  pc.onconnectionstatechange = () => {
    console.log('[Peer] Connection state:', pc.connectionState);
    onConnectionStateChange?.(pc.connectionState);
  };

  pc.oniceconnectionstatechange = () => {
    console.log('[Peer] ICE state:', pc.iceConnectionState);
    if (pc.iceConnectionState === 'failed') pc.restartIce();
  };

  pc.onicegatheringstatechange = () => {
    console.log('[Peer] ICE gathering:', pc.iceGatheringState);
  };

  return pc;
}

export function createDataChannel(pc, label = 'voiddrop-transfer') {
  return pc.createDataChannel(label, {
    ordered: true,
  });
}

export async function createOffer(pc) {
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  return pc.localDescription;
}

export async function createAnswer(pc, offer) {
  await pc.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  // Flush any ICE candidates that arrived before remote description
  await pc._flushCandidates?.();
  return pc.localDescription;
}

export async function handleAnswer(pc, answer) {
  // Only set remote description if we sent an offer
  if (pc.signalingState === 'have-local-offer') {
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
    // Flush any ICE candidates that arrived before remote description
    await pc._flushCandidates?.();
  } else {
    console.warn('[Peer] Ignoring answer in state:', pc.signalingState);
  }
}

export async function addIceCandidate(pc, candidate) {
  if (!candidate) return;
  try {
    // Use the queue system to handle candidates before remoteDescription
    await pc._queueCandidate?.(candidate);
  } catch (e) {
    console.warn('[Peer] Failed to add ICE candidate:', e);
  }
}
