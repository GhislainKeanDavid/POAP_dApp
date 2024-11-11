const express = require('express');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const path = require('path');
const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Endpoint to generate certificate, upload it, and return metadata URI
app.post('/api/generate-certificate', async (req, res) => {
    try {
        const { recipientName, eventDate } = req.body;
        const certificateId = Math.floor(Math.random() * 1000000).toString();

        // Step 1: Generate the certificate
        const certificatePath = await generateCertificate(recipientName, eventDate, certificateId);

        // Step 2: Upload the certificate image to IPFS
        const ipfsImageUrl = await uploadToIPFS(certificatePath);

        // Step 3: Create the metadata for the NFT
        const metadataPath = await createMetadata(recipientName, eventDate, certificateId, ipfsImageUrl);

        // Step 4: Upload the metadata to IPFS and return metadata URI
        const metadataURI = await uploadMetadataToIPFS(metadataPath);

        // Return the metadata URI to the client
        res.json({ metadataURI });
    } catch (error) {
        console.error('Error in certificate generation or IPFS upload:', error);
        res.status(500).json({ error: 'An error occurred while generating the certificate.' });
    }
});

// Function to generate a certificate
async function generateCertificate(recipientName, issuedOn, certificateId) {
    const width = 1414;
    const height = 2000;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Load your certificate template image
    const templatePath = path.join(__dirname, 'templates/poapcertificate_templates.png'); // Ensure the correct path
    const template = await loadImage(templatePath);
    ctx.drawImage(template, 0, 0, width, height);

    // Configure text style
    ctx.font = '100px Arial';  // Increase font size for recipient name
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';

    // Add recipient's name (centered and lowered)
    ctx.fillText(recipientName, 707, 1000);  // Centered and slightly lowered

    // Add certificate ID (left-aligned)
    ctx.font = '50px Arial';  // Larger font for ID and date
    ctx.textAlign = 'left';  // Align text to the left for Certificate ID
    ctx.fillText(certificateId, 218, 1470);  // Just above the "Certificate ID" label, moved to avoid the logo

    // Add issued date (right-aligned)
    ctx.textAlign = 'right';  // Align text to the right for Date of Issue
    ctx.fillText(issuedOn, 1255, 1470);  // Just above the "Date of Issue" label

    // Save the generated certificate as an image
    const outputPath = path.join(__dirname, 'certificates', `${recipientName}_certificate.png`);
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);

    console.log(`Certificate generated: ${outputPath}`);
    return outputPath;  // Return the path to the generated certificate
}

// Function to upload file to IPFS using Pinata
async function uploadToIPFS(filePath) {
    const pinataApiKey = '2ad1551ff9da50a4e0dc';  // Replace with your actual Pinata API Key
    const pinataSecretApiKey = '54186d4cf57e54ab4fe5529a48bdda5b339ec34677d1bccb3eb8f2d3ced329ec';  // Replace with your actual Pinata Secret API Key

    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));

    try {
        const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
            maxContentLength: 'Infinity',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
                pinata_api_key: pinataApiKey,
                pinata_secret_api_key: pinataSecretApiKey,
            },
        });

        const ipfsHash = response.data.IpfsHash;
        console.log('File uploaded to IPFS with CID:', ipfsHash);
        return `ipfs://${ipfsHash}`;  // Return the IPFS URL for the uploaded file
    } catch (error) {
        console.error('Error uploading to IPFS:', error);
        throw error;
    }
}

// Function to create metadata and save it
async function createMetadata(recipientName, eventDate, certificateId, ipfsImageUrl) {
    const metadata = {
        name: "2024 HAU Blockchain Event Attendance Certificate",
        description: "This NFT represents attendance for the 2024 HAU Blockchain Event.",
        image: ipfsImageUrl,
        attributes: [
            { trait_type: "Recipient Name", value: recipientName },
            { trait_type: "Event Date", value: eventDate },
            { trait_type: "Certificate ID", value: certificateId },
        ],
    };

    const metadataFilePath = path.join(__dirname, 'metadata', `${recipientName}_metadata.json`);
    fs.writeFileSync(metadataFilePath, JSON.stringify(metadata, null, 2));

    console.log(`Metadata generated: ${metadataFilePath}`);
    return metadataFilePath;
}

// Function to upload metadata to IPFS
async function uploadMetadataToIPFS(metadataFilePath) {
    return await uploadToIPFS(metadataFilePath);  // Reuse the upload function for metadata
}

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
