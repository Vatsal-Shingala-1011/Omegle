import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Room } from "./Room";

export const Landing = () => {
    const [name, setName] = useState("");
    const [localAudioTrack, setLocalAudioTrack] = useState<MediaStreamTrack | null>(null);
    const [localVideoTrack, setlocalVideoTrack] = useState<MediaStreamTrack | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    const [joined, setJoined] = useState(false);

    const getCam = async () => {
        // This prompts the user for camera and microphone permissions. It returns a MediaStream containing audio and video tracks.
        const stream = await window.navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
    
        // MediaStream contains both audio and video tracks
        const audioTrack = stream.getAudioTracks()[0]; // Default gives one audio track, selecting it
        const videoTrack = stream.getVideoTracks()[0]; // Default gives one video track, selecting it
    
        setLocalAudioTrack(audioTrack);
        setlocalVideoTrack(videoTrack);
    
        if (!videoRef.current) {
            return;
        }
    
        // 🔹 Before setting `srcObject`, `videoRef` looks like this:
        // videoRef = { current: null }  // Initially, no reference to a video element
        // Assign the video track to the <video> element
        videoRef.current.srcObject = new MediaStream([videoTrack]);
        // 🔹 After setting `srcObject`, `videoRef` looks like this:
        // videoRef = {
        //     current: {
        //         srcObject: MediaStream { videoTrack },
        //         play: function() { ... }
        //     }
        // }
    
        videoRef.current.play(); // Start playing the video stream
    };

    // ✅ Runs once when the component mounts because useEffect depends on [videoRef]. 🔄 Would run again if videoRef changed (which is unlikely because useRef does not change across renders).
    useEffect(() => {
        if (videoRef && videoRef.current) {
            getCam()
        }
    },[videoRef]);

    if(!joined){
        return <div>
            <video autoPlay ref={videoRef}> </video>
            <input type="text" onChange={(e) => {
                setName(e.target.value);
            }}>
            </input>
            <button onClick={()=> {
                setJoined(true);
            }}>Join</button>
        </div>
    }
    // if joined return Room component
    return <div>
        return <Room name={name} localAudioTrack={localAudioTrack} localVideoTrack={localVideoTrack} />
    </div>
}


// A MediaStream is an object that contains multiple media tracks (audio, video, etc.).
// Example structure:
// {
//     "id": "random-id",
//     "active": true,
//     "tracks": [
//       {
//         "kind": "audio",
//         "label": "Microphone",
//         "enabled": true
//       },
//       {
//         "kind": "video",
//         "label": "Webcam",
//         "enabled": true
//       }
//     ]
//   }
  

// Each track is a MediaStreamTrack object.
// Example:
// {
//   "kind": "audio",
//   "label": "Microphone",
//   "enabled": true
// }
// {
//   "kind": "video",
//   "label": "Webcam",
//   "enabled": true
// }