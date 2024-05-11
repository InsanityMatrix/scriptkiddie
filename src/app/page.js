// src/pages/index.js
"use client";

import { useState, useEffect, useRef } from 'react';
import { Llamapi } from '../utils/Llamapi';
import { formatChat } from '@/utils/formatting';

const llamapi = new Llamapi();
export default function Home() {
    const [chats, setChats] = useState([]);
    const [prompt, setPrompt] = useState('');
    const [attachment, setAttachment] = useState(null);
    const [formattedChats, setFormattedChats] = useState('');
    const [outputState, setOutputState] = useState('');

    //const cumulativeOutputRef = useRef('');
    const outputRef = useRef(''); // Ref to store output data
    const stopRef = useRef(false); // Ref to control stopping the stream

    const handleChange = (e) => { setPrompt(e.target.value)};
    const handleFileChange = (e) => {
        setAttachment(e.target.files[0]);
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setChats(prev => [...prev, `You: ${prompt}`]);
        setPrompt('');
        outputRef.current = '';
        stopRef.current = false;
        setOutputState('');
        const sanitized = prompt.endsWith(':') ? prompt : prompt + ':';

        let fullHistory = '### System Prompt\nYou are an intelligent programming assistant.\n\n';
        for(let i = 0; i < chats.length; i++) {
            if(i % 0) {
                fullHistory += "### Assistant\n" + chats[i] + "\n\n";
            } else {
                fullHistory += "### User Message\n" + chats[i] + "\n\n";
            }
        }
        fullHistory += "### User Message\n" + sanitized + "\n\n### Assistant\n";
        try {
            const response = await fetch('/api/llm', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  prompt: fullHistory,
                  stream: true,
                })
              });
            
              const reader = response.body.getReader();
              let receivedLength = 0; // bytes received by now
              let chunks = []; // array of received binary chunks (comprises the body)
              while(true) {
                const {done, value} = await reader.read();
            
                if (done) {
                  break;
                }
                console.log(value);
                chunks.push(value);
                receivedLength += value.length;
            
                let chunkText = new TextDecoder("utf-8").decode(value, {stream: true});
                if (chunkText !== "[[[[[STOP]]]]]") {
                  outputRef.current += chunkText;
                  setOutputState(outputRef.current);
                } else {
                  let aiOutput = outputRef.current;
                  outputRef.current = '';
                  setOutputState('');
            
                  setChats(prev => [...prev, `AI: ${aiOutput}`]);
                }
              }
        } catch (error) {
            console.log("ERROR: " + error);
        }
    };

    useEffect(() => {
      // Wait until the content is updated before highlighting
      const fChats = []
      for(let i = 0; i < chats.length; i++) {
        if(chats[i]) {
            fChats.push(formatChat(chats[i], document));
        }
      }

      if(outputRef.current && outputRef.current !== '') {
        fChats.push(formatChat('AI: ' + outputRef.current, document))
      }
      //cumulativeOutputRef.current = fChats;
      setFormattedChats(fChats);

    }, [outputState, chats]);

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4">
            {/* Chat Messages Section */}
            <div className="flex flex-grow flex-col w-full max-w-4xl bg-white rounded-t-lg shadow-md overflow-y-auto break-normal p-4">
                {formattedChats.length ? (
                    formattedChats.map((chat, idx) => (
                        <p key={idx} className="mb-2 text-black divide-y px-3.5 py-2" style={{ wordBreak: "break-word" }} dangerouslySetInnerHTML={{ __html: chat + "\n"}}>
                            
                        </p>
                    ))
                ) : (
                    <p className="text-gray-500">No messages yet</p>
                )}
            </div>

            {/* Fixed Input Form Section */}
            <form className="flex items-center justify-between w-full max-w-4xl bg-white rounded-b-lg shadow-md fixed bottom-0 left-1/2 transform -translate-x-1/2 p-2"
            onSubmit={handleSubmit}>
                <button type="button" className="flex items-center justify-center p-2 rounded-full text-white bg-purple-500 hover:bg-purple-600">
                    <i className="fas fa-paperclip"></i> {/* Attach file icon */}
                </button>
                <input
                    type="text"
                    className="flex-grow mx-2 p-2 border border-gray-300 rounded-full text-black"
                    placeholder="Type your message..."
                    onChange={handleChange}
                    value={prompt}
                />
                <button type="submit" className="flex items-center justify-center p-2 rounded-full text-white bg-blue-500 hover:bg-blue-600">
                    <i className="fas fa-paper-plane"></i> {/* Send message icon */}
                </button>
            </form>
        </div>

    );
}

