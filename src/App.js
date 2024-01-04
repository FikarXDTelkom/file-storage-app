import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import axios from 'axios';

import FileStorage from './contracts/FileStorage.json';

const ipfsBaseURL = 'https://api.pinata.cloud/pinning/pinFileToIPFS';

function App() {
  const [web3, setWeb3] = useState(null);
  const [fileStorage, setFileStorage] = useState(null);
  const [file, setFile] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [currentAccount, setCurrentAccount] = useState(null);

  useEffect(() => {
    connectWallet();
  }, []);

  const connectWallet = async () => {
    try {
      if (window.ethereum) {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const web3Instance = new Web3(window.ethereum);
        setWeb3(web3Instance);

        const networkId = await web3Instance.eth.net.getId();
        const deployedNetwork = FileStorage.networks[networkId];

        if (deployedNetwork) {
          const fileStorageInstance = new web3Instance.eth.Contract(
            FileStorage.abi,
            deployedNetwork.address
          );
          setFileStorage(fileStorageInstance);

          const accounts = await web3Instance.eth.getAccounts();
          setCurrentAccount(accounts[0]);
          loadFiles(accounts[0]);
        } else {
          alert('FileStorage contract not deployed on the current network. Please deploy the contract.');
        }
      } else {
        alert('MetaMask not detected. Please install MetaMask to use this application.');
      }
    } catch (error) {
      console.error('Error connecting to MetaMask:', error.message);
      alert('Error connecting to MetaMask. Please make sure MetaMask is installed, unlocked, and connected to the correct network.');
    }
  };

  const loadFiles = async (account) => {
    if (!fileStorage) return;

    try {
      const count = await fileStorage.methods.fileCount().call();
      const files = [];

      for (let i = 1; i <= count; i++) {
        const fileData = await fileStorage.methods.files(i).call();
        if (fileData.owner.toLowerCase() === account.toLowerCase()) {
          files.push(fileData);
        }
      }

      setUploadedFiles(files);
    } catch (error) {
      console.error('Error loading files:', error.message);
    }
  };

  const captureFile = (event) => {
    const file = event.target.files[0];
    setFile(file);
  };

  const uploadFile = async () => {
    if (!web3) {
      alert('Please connect MetaMask before uploading files.');
      return;
    }

    if (!file) {
      alert('Please select a file');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(ipfsBaseURL, formData, {
        headers: {
          'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
          'pinata_api_key': '1814e492461fc045a989',
          'pinata_secret_api_key': 'e4ec8856c6d73af1e3b223e7dc1c4196ccd020298a53b7260daea5c5da9644c2',
        },
      });

      const ipfsHash = response.data.IpfsHash;

      const accounts = await web3.eth.getAccounts();
      const fromAddress = accounts[0];

      await fileStorage.methods.addFile(ipfsHash, file.name).send({ from: fromAddress });
      alert('File uploaded successfully!');

      // After uploading, reload the list of files
      loadFiles(fromAddress);
    } catch (error) {
      console.error('Error uploading to Pinata:', error.message);
      alert('Error uploading to Pinata. Please try again.');
    }
  };

  const downloadFile = async (ipfsHash, fileName) => {
    try {
      const response = await axios.get(`${ipfsBaseURL}/${ipfsHash}`, { responseType: 'arraybuffer' });
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error.message);
      alert('Error downloading file. Please try again.');
    }
  };

  return (
    <div>
      <h1>File Storage App</h1>
      <button onClick={connectWallet}>Connect MetaMask</button>
      <hr />
      {currentAccount && (
        <>
          <h2>Upload File</h2>
          <input type="file" onChange={captureFile} />
          <button onClick={uploadFile}>Upload File</button>

          <h2>Uploaded Files</h2>
          <ul>
            {uploadedFiles.map((file, index) => (
              <li key={index}>
                <strong>IPFS Hash:</strong> {file.ipfsHash}, <strong>File Name:</strong> {file.fileName}
                <button onClick={() => downloadFile(file.ipfsHash, file.fileName)}>Download</button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default App;
