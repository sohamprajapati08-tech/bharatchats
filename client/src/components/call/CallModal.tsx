import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, User as UserIcon } from 'lucide-react';
import { api } from '../../services/api.js';
import { getSocket } from '../../services/socket.js';

interface CallModalProps {
  callType: 'voice' | 'video';
  partnerId: string;
  partnerName: string;
  partnerAvatar?: string | null;
  isInitiator: boolean;
  incomingOffer?: any;
  onEndCall: () => void;
}

export const CallModal: React.FC<CallModalProps> = ({
  callType,
  partnerId,
  partnerName,
  partnerAvatar,
  isInitiator,
  incomingOffer,
  onEndCall,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(callType === 'voice');
  const [callDuration, setCallDuration] = useState(0);
  const [callStatus, setCallStatus] = useState<string>(isInitiator ? 'Calling...' : 'Connecting...');

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let pc: RTCPeerConnection;

    const startWebRTC = async () => {
      try {
        // Fetch STUN servers from backend
        const config = await api.getWebRTCConfig();
        pc = new RTCPeerConnection({ iceServers: config.iceServers });
        peerConnectionRef.current = pc;

        // Get local audio and/or video stream
        const constraints = {
          audio: true,
          video: callType === 'video' ? { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } : false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        localStreamRef.current = stream;

        if (localVideoRef.current && callType === 'video') {
          localVideoRef.current.srcObject = stream;
        }

        // Add tracks to PeerConnection
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        // Remote track listener
        pc.ontrack = (event) => {
          if (remoteVideoRef.current && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0];
            setCallStatus('Connected');

            // Start duration timer once connected
            if (!durationTimerRef.current) {
              durationTimerRef.current = setInterval(() => {
                setCallDuration((prev) => prev + 1);
              }, 1000);
            }
          }
        };

        // ICE candidates
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            getSocket()?.emit('ice_candidate', {
              toUserId: partnerId,
              candidate: event.candidate,
            });
          }
        };

        // If caller, create offer
        if (isInitiator) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          getSocket()?.emit('call_initiate', {
            toUserId: partnerId,
            type: callType,
            offer,
          });
        } else if (incomingOffer) {
          // If receiver, accept incoming offer and create answer
          await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          getSocket()?.emit('call_accept', {
            toUserId: partnerId,
            answer,
          });
        }

        // Socket listeners
        const socket = getSocket();
        if (socket) {
          socket.on('call_accepted', async (data: any) => {
            if (data.answer && pc) {
              await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
              setCallStatus('Connected');
              if (!durationTimerRef.current) {
                durationTimerRef.current = setInterval(() => {
                  setCallDuration((prev) => prev + 1);
                }, 1000);
              }
            }
          });

          socket.on('ice_candidate', async (data: any) => {
            if (data.candidate && pc) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
              } catch (e) {
                console.error('Error adding ICE candidate:', e);
              }
            }
          });

          socket.on('call_rejected', () => {
            setCallStatus('Call Declined');
            setTimeout(handleHangup, 1500);
          });

          socket.on('call_ended', () => {
            setCallStatus('Call Ended');
            setTimeout(handleHangup, 1000);
          });
        }
      } catch (err: any) {
        console.error('WebRTC initialization error:', err);
        setCallStatus(`Error: ${err.message || 'Media access failed'}`);
      }
    };

    startWebRTC();

    return () => {
      cleanupMedia();
    };
  }, []);

  const cleanupMedia = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
    }
  };

  const handleHangup = async () => {
    // Notify peer
    getSocket()?.emit('call_end', { toUserId: partnerId });

    // Log call to backend database
    try {
      await api.logCall({
        receiverId: partnerId,
        type: callType,
        status: callDuration > 0 ? 'completed' : 'missed',
        durationSeconds: callDuration,
      });
    } catch (e) {
      console.error('Failed to log call:', e);
    }

    cleanupMedia();
    onEndCall();
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoDisabled(!videoTrack.enabled);
      }
    }
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="call-overlay">
      {/* Top Header */}
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10 }}>
        <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff' }}>{partnerName}</h3>
        <span style={{ fontSize: '0.88rem', color: 'var(--primary-emerald)', marginTop: '4px' }}>
          {callDuration > 0 ? formatDuration(callDuration) : callStatus}
        </span>
      </div>

      {/* Main viewport */}
      <div className="call-video-grid">
        {callType === 'video' ? (
          <>
            <video ref={remoteVideoRef} autoPlay playsInline className="remote-video" />
            <video ref={localVideoRef} autoPlay playsInline muted className="local-video-preview" />
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                backgroundColor: 'var(--bg-card)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 40px rgba(0, 168, 132, 0.4)',
                marginBottom: '16px',
              }}
            >
              {partnerAvatar ? (
                <img src={partnerAvatar} alt={partnerName} style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
              ) : (
                <UserIcon size={56} color="var(--primary-emerald)" />
              )}
            </div>
            {/* Audio hidden element */}
            <audio ref={remoteVideoRef} autoPlay />
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="call-controls-bar">
        <button
          className={`btn-call-action btn-call-toggle ${isMuted ? 'active' : ''}`}
          onClick={toggleMute}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
        </button>

        {callType === 'video' && (
          <button
            className={`btn-call-action btn-call-toggle ${isVideoDisabled ? 'active' : ''}`}
            onClick={toggleVideo}
            title={isVideoDisabled ? 'Enable Camera' : 'Disable Camera'}
          >
            {isVideoDisabled ? <VideoOff size={24} /> : <Video size={24} />}
          </button>
        )}

        <button className="btn-call-action btn-call-hangup" onClick={handleHangup} title="End Call">
          <PhoneOff size={24} />
        </button>
      </div>
    </div>
  );
};
