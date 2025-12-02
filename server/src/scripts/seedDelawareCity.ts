/**
 * Seed script to create the Delaware, OH city landing page prototype
 *
 * Run with: npx ts-node src/scripts/seedDelawareCity.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDB } from '../config/database';
import { CityLandingPage, Store } from '../models';

async function seedDelawareCity() {
	try {
		await connectDB();
		console.log('Connected to database');

		// Check if Delaware city page already exists
		const existingPage = await CityLandingPage.findOne({
			slug: 'delaware-oh',
		});

		if (existingPage) {
			console.log('Delaware, OH city page already exists!');
			console.log(
				'Current status:',
				existingPage.isActive ? 'Active' : 'Draft'
			);
			console.log('To update, use the admin panel at /admin/cities');
		} else {
			// Create the city landing page
			const delawarePage = new CityLandingPage({
				slug: 'delaware-oh',
				cityName: 'Delaware',
				state: 'OH',
				headline: 'Discover Plant-Based Options in Central Ohio',
				description:
					'Delaware, Ohio is a growing community with an expanding selection of vegan and plant-based products. From local grocery stores to specialty shops, find everything you need to maintain a plant-based lifestyle in Delaware County.',
				isActive: true,
				featuredStoreIds: [],
			});

			await delawarePage.save();
			console.log('✅ Created Delaware, OH city landing page');
			console.log('   Slug:', delawarePage.slug);
			console.log('   Active:', delawarePage.isActive);
		}

		// Check for any existing stores in Delaware, OH
		const delawareStores = await Store.find({
			city: { $regex: /^delaware$/i },
			state: { $regex: /^oh$/i },
			type: 'brick_and_mortar',
		});

		if (delawareStores.length > 0) {
			console.log(
				`\n📍 Found ${delawareStores.length} existing store(s) in Delaware, OH:`
			);
			delawareStores.forEach((store) => {
				console.log(
					`   - ${store.name} (${store.address || 'no address'})`
				);
			});
		} else {
			console.log('\n📍 No stores found in Delaware, OH yet.');
			console.log(
				'   You can add stores through the admin panel or by adding availability to products.'
			);

			// Optionally seed some example stores for Delaware, OH
			console.log('\n🏪 Creating example stores for Delaware, OH...');

			const exampleStores = [
				{
					name: 'Kroger - Delaware',
					type: 'brick_and_mortar' as const,
					regionOrScope: 'Delaware, OH',
					address: '2080 US-23',
					city: 'Delaware',
					state: 'OH',
					zipCode: '43015',
					country: 'US',
					latitude: 40.2861,
					longitude: -83.0749,
				},
				{
					name: 'Meijer - Delaware',
					type: 'brick_and_mortar' as const,
					regionOrScope: 'Delaware, OH',
					address: '2001 US-23',
					city: 'Delaware',
					state: 'OH',
					zipCode: '43015',
					country: 'US',
					latitude: 40.2855,
					longitude: -83.076,
				},
				{
					name: 'Fresh Thyme Farmers Market',
					type: 'brick_and_mortar' as const,
					regionOrScope: 'Delaware, OH',
					address: '1010 Sunbury Rd',
					city: 'Delaware',
					state: 'OH',
					zipCode: '43015',
					country: 'US',
					latitude: 40.2989,
					longitude: -83.0509,
				},
			];

			for (const storeData of exampleStores) {
				const existingStore = await Store.findOne({
					name: storeData.name,
					city: { $regex: /^delaware$/i },
					state: { $regex: /^oh$/i },
				});

				if (!existingStore) {
					const store = new Store(storeData);
					await store.save();
					console.log(`   ✅ Created: ${store.name}`);
				} else {
					console.log(`   ⏭️  Already exists: ${storeData.name}`);
				}
			}
		}

		console.log('\n🎉 Delaware, OH seed complete!');
		console.log('   Visit: /cities/delaware-oh to see the landing page');
		console.log('   Admin: /admin/cities to manage city pages');
	} catch (error) {
		console.error('Error seeding Delaware city:', error);
		process.exit(1);
	} finally {
		await mongoose.disconnect();
		console.log('\nDisconnected from database');
	}
}

seedDelawareCity();
