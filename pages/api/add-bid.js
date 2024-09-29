import { IncomingForm } from 'formidable';
import fs from 'fs';
import path from 'path';
import dbConnect from '../../lib/db';
import Auction from '../../models/Auction';
import Bid from '../../models/Bid';

export const config = {
  api: {
    bodyParser: false, // Disable Next.js default body parser
  },
};

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // Set the upload directory to /uploads
  const uploadDir = path.join(process.cwd(), '/public/uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const form = new IncomingForm({
    uploadDir: uploadDir, // Set the upload directory to /uploads
    keepExtensions: true, // Keep file extensions
    maxFileSize: 5 * 1024 * 1024, // Limit file size to 5MB
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Error parsing form data:', err);
      return res.status(500).json({ message: 'Error parsing form data' });
    }

    const { auctionId, bidderId, itemName, itemDescription } = fields;
    const itemImage = files.image ? `/uploads/${files.image.newFilename}` : null;

    if (!auctionId || !bidderId || !itemName || !itemDescription) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
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
  });
}
