import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
	try {
		const mongoURI = process.env.MONGODB_URI;

		if (!mongoURI) {
			throw new Error(
				'MONGODB_URI is not defined in environment variables'
			);
		}

		await mongoose.connect(mongoURI);
		console.log('✅ MongoDB Atlas connected successfully');
	} catch (error) {
		console.error('❌ MongoDB connection error:', error);
		throw error;
	}
};

// Handle connection events
mongoose.connection.on('disconnected', () => {
	console.log('MongoDB disconnected');
});

mongoose.connection.on('error', (error) => {
	console.error('MongoDB error:', error);
});
