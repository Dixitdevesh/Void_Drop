/**
 * VoidDrop — RTCPeerConnection Setup
 * Manages ICE configuration and DataChannel lifecycle.
 */

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

export function createPeerConnection(onICECandidate, onDataChannel, onConnectionStateChange) {
  const pc = new RTCPeerConnection({
    iceServers: ICE_SERVERS,
    iceCandidatePoolSize: 10,
  });

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      onICECandidate?.(event.candidate);
    }
  };

  pc.ondatachannel = (event) => {
    onDataChannel?.(event.channel);
  };

  pc.onconnectionstatechange = () => {
    onConnectionStateChange?.(pc.connectionState);
  };

  pc.oniceconnectionstatechange = () => {
    if (pc.iceConnectionState === 'failed') {
      pc.restartIce();
    }
  };

  return pc;
}

export function createDataChannel(pc, label = 'voiddrop-transfer') {
  return pc.createDataChannel(label, {
    ordered: true,          // maintain chunk order
    maxRetransmits: 30,     // retry failed packets
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
  return pc.localDescription;
}

export async function handleAnswer(pc, answer) {
  if (pc.signalingState !== 'stable') {
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
  }
}

export async function addIceCandidate(pc, candidate) {
  try {
    if (pc.remoteDescription && candidate) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  } catch (e) {
    console.warn('[Peer] Failed to add ICE candidate:', e);
  }
}
