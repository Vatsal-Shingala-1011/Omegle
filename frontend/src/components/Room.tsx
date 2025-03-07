import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Socket, io } from "socket.io-client";

const URL = "http://localhost:3000"; //backend url

export const Room = ({
    name,
    localAudioTrack,
    localVideoTrack
}: {
    name: string,
    localAudioTrack: MediaStreamTrack | null,
    localVideoTrack: MediaStreamTrack | null,
}) => {
    const [lobby, setLobby] = useState(true);
    const [socket, setSocket] = useState<null | Socket>(null);
    const [sendingPc, setSendingPc] = useState<null | RTCPeerConnection>(null);
    const [receivingPc, setReceivingPc] = useState<null | RTCPeerConnection>(null);
    const [remoteVideoTrack, setRemoteVideoTrack] = useState<MediaStreamTrack | null>(null);
    const [remoteAudioTrack, setRemoteAudioTrack] = useState<MediaStreamTrack | null>(null);
    const [remoteMediaStream, setRemoteMediaStream] = useState<MediaStream | null>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>();
    const localVideoRef = useRef<HTMLVideoElement>();

    //user1 local,  user2 remote
    useEffect(() => {
        // Socket.io = Helps exchange signaling data.
        // WebRTC = Handles peer-to-peer connection & media streaming.

        // Socket.io (io(URL)) maintain a persistent connection between the client and the signaling server.
        const socket = io(URL); // Connect to the WebSocket server. The client sets up event listeners

        socket.on('send-offer', async ({roomId}) => { //Server tells User 1 to send an offer(send-offer is emmit from server)
            console.log("sending offer")
            setLobby(false);
            const pc = new RTCPeerConnection(); //make peer connnection. there is pc for each user sendingPc and receivingPc
            setSendingPc(pc); 

            if(localVideoTrack) pc.addTrack(localVideoTrack)
            if(localAudioTrack) pc.addTrack(localAudioTrack)

            // Exchanging ICE Candidates(Both users find the best network path using ICE candidates.)
            pc.onicecandidate = async (e) => {
                if(e.candidate){
                    socket.emit("add-ice-candidate", {
                        candidate: e.cancelable,
                        type: "sender",
                        roomId
                    })
                }
            }

            // Triggers "onnegotiationneeded", which starts the WebRTC handshake
            pc.onnegotiationneeded = async () => {
                console.log("on negotiation neeeded, sending offer");
                const sdp = await pc.createOffer(); // User 1 creates an SDP offer & sends it
                //@ts-ignore
                pc.setLocalDescription(sdp)
                socket.emit("offer", {
                    sdp,
                    roomId
                })
            }
        })

        socket.on("offer", async ({roomId, offer}) => { // User 2 receives the offer from the server
            setLobby(false);
            const pc = new RTCPeerConnection(); //make peer connnection
            pc.setRemoteDescription({sdp: offer, type:"offer"})
            const sdp = await pc.createAnswer(); // same as pc.createOffer()
            //@ts-ignore     
            pc.setLocalDescription(sdp)
            const stream = new MediaStream();
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = stream;
            }

            setRemoteMediaStream(stream);
            setReceivingPc(pc);
            
            pc.onicecandidate = async (e) => { // Exchanging ICE Candidates(Both users find the best network path using ICE candidates.)
                if (!e.candidate) {
                    return;
                }
                console.log("on ice candidate on receiving seide");
                if (e.candidate) {
                   socket.emit("add-ice-candidate", {
                    candidate: e.candidate,
                    type: "receiver",
                    roomId
                   })
                }
            }

            socket.emit("answer", { // User 2 creates an answer & sends it back
                roomId,
                sdp: sdp
            });

            // pc.ontrack = (e) => { // not working so wait for 5 sec so after 5 sec all function runs and track are available
            //     alert("ontrack");
            //     console.error("inside ontrack");
            //     const {track, type} = e;
            //     if (type == 'audio') {
            //         // setRemoteAudioTrack(track);
            //         // @ts-ignore
            //         remoteVideoRef.current.srcObject.addTrack(track)
            //     } else {
            //         // setRemoteVideoTrack(track);
            //         // @ts-ignore
            //         remoteVideoRef.current.srcObject.addTrack(track)
            //     }
            //     //@ts-ignore
            //     remoteVideoRef.current.play();
            // }

            setTimeout(() => { //this run 5 sec after so tracks are available (doing this because ontrack is not working )
                const track1 = pc.getTransceivers()[0].receiver.track
                const track2 = pc.getTransceivers()[1].receiver.track
                console.log(track1);
                if (track1.kind === "video") {
                    setRemoteAudioTrack(track2)
                    setRemoteVideoTrack(track1)
                } else {
                    setRemoteAudioTrack(track1)
                    setRemoteVideoTrack(track2)
                }
                //@ts-ignore
                remoteVideoRef.current.srcObject.addTrack(track1)
                //@ts-ignore
                remoteVideoRef.current.srcObject.addTrack(track2)
                //@ts-ignore
                remoteVideoRef.current.play();
            }, 5000);

        });

        socket.on("answer", ({roomId, sdp: remoteSdp}) => { // User 1 gets the answer from User 2
            setLobby(false);
            setSendingPc(pc => { // User 1 sets the remote description
                pc?.setRemoteDescription(remoteSdp)
                return pc;
            })
            console.log("loop closed");
        })

        socket.on("lobby", () => {
            setLobby(true);
        })

        socket.on("add-ice-candidate", ({candidate, type})=> {
            console.log("add ice candidate from remote");
            console.log({candidate, type})
            if (type == "sender") {
                setReceivingPc(pc => {
                    if (!pc) {
                        console.error("receicng pc nout found")
                    } else {
                        console.error(pc.ontrack)
                    }
                    pc?.addIceCandidate(candidate)
                    return pc;
                });
            } else {
                setSendingPc(pc => {
                    if (!pc) {
                        console.error("sending pc nout found")
                    } else {
                        // console.error(pc.ontrack)
                    }
                    pc?.addIceCandidate(candidate)
                    return pc;
                });
            }
        })

        setSocket(socket)
    },[name])

    useEffect(() => {
        if(localVideoRef.current){
            if(localVideoTrack) {
                localVideoRef.current.srcObject = new MediaStream([localVideoTrack]);
                localVideoRef.current.play();
            }
        }
    }, [localVideoRef])

    return <div>
        Hi {name}
        <video autoPlay width={400} height={400} ref={localVideoRef} />
        {lobby ? "Waiting to connect you to someone" : null}
        <video autoPlay width={400} height={400} ref={remoteVideoRef} />
    </div>
}

// Overview of the Process
// Socket.io helps in real-time bidirectional communication between clients and servers.

// 📌 How It Works in Your Code
// Client (User 1) connects to the server (io(URL)).
// User 1 emits an event to join a room (send-offer).
// Server broadcasts the event to User 2 (offer).
// User 2 responds with an answer event.
// Server forwards the answer back to User 1.
// ICE candidates (add-ice-candidate) are exchanged to establish a direct WebRTC connection.


// Function	Purpose
// useEffect(() => {...}, [name])	Establishes WebSocket connection and listens for events.
// socket.on('send-offer')	User 1 creates an offer.
// socket.on("offer")	User 2 responds with an answer.
// socket.on("answer")	User 1 sets remote description.
// pc.onicecandidate	Sends ICE candidates to the signaling server.
// socket.on("add-ice-candidate")	Receives and adds ICE candidates.
// useEffect(() => {...}, [localVideoRef])	Displays User 1’s local video.

// Final Thoughts 💡
// User 1 creates an offer → User 2 answers → ICE candidates are exchanged → Video is displayed.
// 💡💡💡💡Each user has their own RTCPeerConnection.💡💡💡💡
// onnegotiationneeded is needed to trigger SDP exchange when media is added.
// ICE candidates allow WebRTC to work over NAT/firewalls.
// WebRTC & Socket.io work together: WebRTC handles video, Socket.io handles signaling.
// 5️⃣ Summary
// Socket.io handles WebRTC signaling (offer, answer, ICE candidates).
// WebRTC handles peer-to-peer audio/video streaming.
// ICE candidates allow WebRTC to work across different networks (NAT/firewalls).
// After signaling, WebRTC directly connects peers, bypassing the server.

// 2️⃣ Key Socket.io Events in Your Code
// Event	Who Sends It?	Who Listens?	Purpose
// send-offer	Server → User 1	socket.on('send-offer', ...)	Tells User 1 to create an offer.
// offer	User 1 → Server → User 2	socket.on("offer", ...)	Sends WebRTC offer from User 1 to User 2.
// answer	User 2 → Server → User 1	socket.on("answer", ...)	Sends WebRTC answer from User 2 to User 1.
// add-ice-candidate	Both Users → Server → Each Other	socket.on("add-ice-candidate", ...)	Exchanges ICE candidates for connection setup.
// lobby	Server → All Users	socket.on("lobby", ...)	Notifies users they are in a waiting state.


// [ User 1 ]                                    [ Server ]                                  [ User 2 ]
//     │                                              │                                         │
//     │ 1️⃣ Connects to WebSocket                     │                                         │
//     ├───────────────► io(URL)                      │                                         │
//     │                                              │                                         │
//     │ 2️⃣ Server assigns User 1 to a room           │                                         │
//     │                                              │                                         │
//     │ 3️⃣ Server sends "send-offer" event           │                                         │
//     ├───────────────► "send-offer"                 │                                         │
//     │                                              │                                         │
//     │ 4️⃣ User 1 creates WebRTC offer (SDP)        │                                         │
//     │                                              │                                         │
//     │ 5️⃣ Sends "offer" to the server               │                                         │
//     ├──────────────────────────────────────────────► "offer"                                  │
//     │                                              │ 6️⃣ Server relays "offer" to User 2     │
//     │                                              ├───────────────► "offer"                 │
//     │                                              │                                         │
//     │                                              │ 7️⃣ User 2 receives offer, creates answer |
//     │                                              │                                         │
//     │                                              │ 8️⃣ Sends "answer" to server            │
//     │                                              ├───────────────► "answer"                │
//     │                                              │                                         │
//     │ 9️⃣ Server relays "answer" to User 1         │                                         │
//     ├──────────────────────────────────────────────► "answer"                                 │
//     │                                              │                                         │
//     │ 1️⃣0️⃣ User 1 sets remote SDP                 │                                         │
//     │                                              │                                         │
//     │ 1️⃣1️⃣ ICE Candidates are exchanged          │                                         │
//     │ ────────────────────────────────────────────► "add-ice-candidate"                      │
//     │ ◀─────────────────────────────────────────── "add-ice-candidate"                      │
//     │                                              │                                         │
//     │ 1️⃣2️⃣ WebRTC connection established        │                                         │
//     │                                              │                                         │
//     │ 1️⃣3️⃣ Video & Audio stream starts!         │                                         │


    

// The socket connection in this code is a WebSocket connection established using Socket.io.
// 1️⃣ Type of Socket Connection:
// Bidirectional, event-driven WebSocket communication
// Uses Socket.io (io(URL)) to maintain a persistent connection between the client and the signaling server.
// The connection starts as HTTP but upgrades to WebSocket for real-time, low-latency communication.
// 2️⃣ Purpose of the Socket Connection:
// The WebSocket connection is used for signaling in WebRTC.
// Since WebRTC cannot establish direct connections initially (due to NAT and firewall issues), we need a signaling server to exchange the necessary information.

// 3️⃣ What Does Socket.io Handle?
// ✔ Signaling messages (Offer, Answer, ICE Candidates)
// ✔ Room management (joining a room, matching peers)
// ✔ Real-time event-based communication