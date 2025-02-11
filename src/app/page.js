// src/pages/index.js
"use client";

import { useState, useEffect, useRef } from 'react';
import { Llamapi } from '../utils/Llamapi';
import { formatChat } from '@/utils/formatting';
import Modal from 'react-modal';

//Modal.setAppElement('#root');

export default function Home() {
    const [chats, setChats] = useState([{role: 'system', content: 'You are an intelligent assistant named Aurora. You will do your best to aid the user in any task they wish to be performed.'}]);
    const [prompt, setPrompt] = useState('');
    const [attachment, setAttachment] = useState(null);
    const [formattedChats, setFormattedChats] = useState('');
    const [outputState, setOutputState] = useState('');
    const [modalIsOpen, setModalIsOpen] = useState(false);

    //const cumulativeOutputRef = useRef('');
    const outputRef = useRef(''); // Ref to store output data
    const stopRef = useRef(false); // Ref to control stopping the stream

    const handleChange = (e) => { setPrompt(e.target.value)};
    const handleFileChange = (e) => {
        setAttachment(e.target.files[0]);
        setModalIsOpen(false);
    };

    const openModal = () => setModalIsOpen(true);
    const closeModal = () => setModalIsOpen(false);


    const handleSubmit = async (e) => {
        e.preventDefault();
        let nChats = [...chats, {role: 'user', content: prompt}];
        setChats(prev => [...prev, { role: 'user', content: prompt }]);
        setPrompt('');
        outputRef.current = '';
        stopRef.current = false;
        setOutputState('');
        sendRequest(nChats);
    };
    const sendRequest = async (fullHistory) => {
      try {
        const response = await fetch('/api/llm', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messages: fullHistory,
              stream: true,
            })
          });
        
          const reader = response.body.getReader();
          let receivedLength = 0; // bytes received by now
          let chunks = []; // array of received binary chunks (comprises the body)
          let endthink = false;
          setOutputState(outputRef.current += 'Thinking...\n');
          while(true) {
            const {done, value} = await reader.read();
        
            if (done) {
              break;
            }
            chunks.push(value);
            receivedLength += value.length;
            
            let chunkJSONS = new TextDecoder("utf-8").decode(value, {stream: true});
            try {
              let chunksSplit = chunkJSONS.split('\n').map(line => line.replace(/,$/, ""));
              if(chunksSplit[chunksSplit.length-1] == "" || chunksSplit[chunksSplit.length-1] == undefined) {
                chunksSplit = chunksSplit.slice(0, chunksSplit.length-1);
              }
              let chunksJSON = chunksSplit.map(line => JSON.parse(line));
              //console.log(`JSON = ${chunkJSONS}`);
              for(let j = 0; j <= chunksJSON.length; j++) {
                let chunkJSON = chunksJSON[j];
                if (!chunkJSON) {
                  continue;
                }
                try {
                  let words = chunkJSON.choices;
                  for(let i = 0; i < words.length; i++) {
                    let word = words[i];
                    let chunkText = word.delta.content;
                    
                    if (!endthink) {
                      endthink = chunkText.includes("</think>");
                    } else {
                      if (word.finish_reason == null) {
                        outputRef.current += chunkText;
                        setOutputState(outputRef.current);
                      } else {
                        let aiOutput = outputRef.current;
                        //TODO: If attachment, capture script output and run it on the file- then send back through AI.
                        if(aiOutput.endsWith("[[[RUNNING SCRIPT]]]")) {
                          try {
                            const response = await fetch('/api/python', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({ aiOutput: aiOutput }),
                            });
                            const data = await response.json();
                            if (response.ok) {
                              aiOutput = data.result;
                            } else {
                              console.error('Error:', data.error);
                            }
                          } catch (error) {
                            console.error('Error:', error);
                          }
                        }
                        console.log('Saving');
                        setChats(prev => [...prev, { role: 'assistant', content: aiOutput }]);
                        outputRef.current = '';
                        setOutputState('');
                      }
                    }
                  }
                } catch (useError) {
                  console.error(`JSON mapping error on: ${chunkJSON}`);
                  console.error(`Error: ${useError}`);
                }
              }
              
            } catch (parseError) {
              console.error("JSON parse error on chunk: ", chunkJSONS);
              console.error(`Error: ${parseError}`);
            }
            
          }
      } catch (error) {
          console.log("ERROR: " + error);
      }
    }
    useEffect(() => {
      // Wait until the content is updated before highlighting
      const fChats = []
      for(let i = 0; i < chats.length; i++) {
        if(chats[i]) {
            fChats.push(formatChat(chats[i], document));
        }
      }

      if(outputRef.current && outputRef.current !== '') {
        fChats.push(formatChat({ role: 'assistant', content: outputRef.current }, document))
      }
      //cumulativeOutputRef.current = fChats;
      setFormattedChats(fChats);

    }, [outputState, chats]);

    return (
          <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4">
          {/* Chat Messages Section */}
          <div className="flex flex-grow flex-col w-full max-w-4xl bg-white rounded-t-lg shadow-md overflow-y-auto break-normal p-4 pb-6">
              {formattedChats.length ? (
                  formattedChats.map((chat, idx) => (
                      <p key={idx} className="mb-2 text-black px-3.5 py-2" style={{ wordBreak: "break-word" }} dangerouslySetInnerHTML={{ __html: chat + "\n"}}></p>
                  ))
              ) : (
                  <p className="text-gray-500">Ask me anything.</p>
              )}
          </div>

          {/* Fixed Input Form Section */}
          <form className="flex items-center justify-between w-full max-w-4xl bg-white rounded-b-lg shadow-md fixed bottom-0 left-1/2 transform -translate-x-1/2 p-2" onSubmit={handleSubmit}>
              <button type="button" className="flex items-center justify-center p-2 rounded-full text-white bg-purple-500 hover:bg-purple-600" onClick={openModal}>
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

          {/* Modal for file attachment  */}
          <Modal
                isOpen={modalIsOpen}
                onRequestClose={closeModal}
                className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50"
                overlayClassName="fixed inset-0 bg-gray-900 bg-opacity-50"
            >
                <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full">
                    <h2 className="text-2xl mb-4">Attach a file</h2>
                    <input type="file" onChange={handleFileChange} className="mb-4"/>
                    <button onClick={closeModal} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">Close</button>
                </div>
            </Modal> 
      </div>

    );
}

