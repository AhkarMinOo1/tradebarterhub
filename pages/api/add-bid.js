import { IncomingForm } from 'formidable';
import fs from 'fs';
import path from 'path';
import dbConnect from '../../lib/db';
import Auction from '../../models/Auction';
import Bid from '../../models/Bid';

// Disable Next.js default body parser
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper function to parse form data using Formidable
const parseForm = (req) => {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({
      uploadDir: path.join(process.cwd(), '/public/uploads'),
      keepExtensions: true,
      maxFileSize: 5 * 1024 * 1024, // 5MB file size limit
    });

    // Ensure the 'public/uploads' directory exists
    if (!fs.existsSync(path.join(process.cwd(), '/public/uploads'))) {
      fs.mkdirSync(path.join(process.cwd(), '/public/uploads'), { recursive: true });
    }

    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
};

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // Parse form data and files
    const { fields, files } = await parseForm(req);

    // Convert arrays to strings (Formidable may return arrays for text fields)
    const auctionId = Array.isArray(fields.auctionId) ? fields.auctionId[0] : fields.auctionId;
    const bidderId = Array.isArray(fields.bidderId) ? fields.bidderId[0] : fields.bidderId;
    const itemName = Array.isArray(fields.itemName) ? fields.itemName[0] : fields.itemName;
    const itemDescription = Array.isArray(fields.itemDescription) ? fields.itemDescription[0] : fields.itemDescription;

    if (!auctionId || !bidderId || !itemName || !itemDescription) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Access the uploaded image file
    const image = files.image && files.image[0];
    const itemImage = image ? `/uploads/${image.newFilename}` : null;

    // Verify the auction exists
    const auction = await Auction.findById(auctionId);
    if (!auction) {
      return res.status(404).json({ message: 'Auction not found' });
    }

    // Create a new bid
    const newBid = new Bid({
      auction: auctionId,
      bidder: bidderId,
      itemName,
      itemDescription,
      itemImage, // Optional item image
    });

    // Save the bid to the database
    await newBid.save();

    return res.status(200).json({ message: 'Bid added successfully', bid: newBid });
  } catch (error) {
    console.error('Error adding bid:', error);
    return res.status(500).json({ message: 'Error adding bid' });
  }
}
