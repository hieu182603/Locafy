require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const {
  Account,
  SellerProfile,
  UserPreference,
  Property,
  Room,
  Listing,
  Appointment,
  Conversation,
  Message,
  Notification,
  ServicePackage,
  Subscription,
  Transaction,
  Report,
  Favorite,
  ViewHistory,
  SavedSearch,
  Otp,
} = require('./models');


const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/locafy';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const id = () => new mongoose.Types.ObjectId();
const daysFromNow = (n) => new Date(Date.now() + n * 24 * 3600 * 1000);

// ─────────────────────────────────────────────────────────────────────────────
async function seed() {
  try {
    console.log('🔌 Connecting to:', MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected.\n');

    // ── 0. Wipe ──────────────────────────────────────────────────────────────
    console.log('🗑️  Wiping all collections...');
    await Promise.all([
      Account.deleteMany({}),
      SellerProfile.deleteMany({}),
      UserPreference.deleteMany({}),
      Property.deleteMany({}),
      Room.deleteMany({}),
      Listing.deleteMany({}),
      Appointment.deleteMany({}),
      Conversation.deleteMany({}),
      Message.deleteMany({}),
      Notification.deleteMany({}),
      ServicePackage.deleteMany({}),
      Subscription.deleteMany({}),
      Transaction.deleteMany({}),
      Report.deleteMany({}),
      Favorite.deleteMany({}),
      ViewHistory.deleteMany({}),
      SavedSearch.deleteMany({}),
      Otp.deleteMany({}),
    ]);
    console.log('✅ Done.\n');


    const hash = await bcrypt.hash('123456', 10);

    // ── 1. Accounts ──────────────────────────────────────────────────────────
    console.log('👤 Seeding accounts...');

    const [user1, user2, user3, seller1, seller2, admin] = await Account.insertMany([
      {
        name: 'Nguyễn Văn Hải',
        email: 'user1@locafy.com',
        phone: '0987654321',
        password: hash,
        role: 'user',
        isEmailVerified: true,
        isPhoneVerified: true,
        isActive: true,
        isProfileComplete: true,
      },
      {
        name: 'Trần Thị Mai',
        email: 'user2@locafy.com',
        phone: '0977888999',
        password: hash,
        role: 'user',
        isEmailVerified: true,
        isPhoneVerified: false,
        isActive: true,
        isProfileComplete: true,
      },
      {
        name: 'Phạm Minh Đức',
        email: 'user3@locafy.com',
        phone: '0933222111',
        password: hash,
        role: 'user',
        isEmailVerified: true,
        isPhoneVerified: false,
        isActive: true,
        isProfileComplete: false, // chưa điền hồ sơ đầy đủ
      },
      {
        name: 'Lê Hùng Sơn',
        email: 'seller1@locafy.com',
        phone: '0912345678',
        password: hash,
        role: 'seller',
        isEmailVerified: true,
        isPhoneVerified: true,
        isActive: true,
        isProfileComplete: true,
        verificationStatus: 'approved',
      },
      {
        name: 'Hoàng Thu Thủy',
        email: 'seller2@locafy.com',
        phone: '0901234567',
        password: hash,
        role: 'seller',
        isEmailVerified: true,
        isPhoneVerified: true,
        isActive: true,
        isProfileComplete: true,
        verificationStatus: 'approved',
      },
      {
        name: 'Quản trị viên Locafy',
        email: 'admin@locafy.com',
        phone: '0900000000',
        password: hash,
        role: 'admin',
        isEmailVerified: true,
        isPhoneVerified: true,
        isActive: true,
        isProfileComplete: true,
      },
    ]);
    console.log(`   → ${[user1, user2, user3, seller1, seller2, admin].length} accounts`);

    // ── 2. SellerProfiles ────────────────────────────────────────────────────
    console.log('🏠 Seeding seller profiles...');
    await SellerProfile.insertMany([
      {
        account: seller1._id,
        sellerType: 'owner',
        businessName: 'Nhà Trọ Lê Sơn - Hòa Lạc',
        contactAddress: 'Khu Bến Trung, Thạch Hòa, Thạch Thất, Hà Nội',
        description: 'Chủ nhà nhiều năm kinh nghiệm cho thuê phòng trọ khu vực Hòa Lạc, cạnh các trường đại học.',
        idCardFrontUrl: '/docs/seller1_cccd_front.jpg',
        idCardBackUrl: '/docs/seller1_cccd_back.jpg',
        propertyDocUrls: ['/docs/seller1_house_cert.pdf'],
        verificationSubmittedAt: daysFromNow(-15),
        totalProperties: 2,
        totalListings: 4,
        totalActiveListings: 4,
      },
      {
        account: seller2._id,
        sellerType: 'manager',
        businessName: 'Hoàng Thủy Property Management',
        contactAddress: 'Đường Tân Xã, Tân Xã, Thạch Thất, Hà Nội',
        description: 'Quản lý nhiều tòa nhà cho thuê khu Hòa Lạc, cam kết chất lượng dịch vụ.',
        idCardFrontUrl: '/docs/seller2_cccd_front.jpg',
        idCardBackUrl: '/docs/seller2_cccd_back.jpg',
        propertyDocUrls: ['/docs/seller2_management_agreement.pdf'],
        verificationSubmittedAt: daysFromNow(-20),
        totalProperties: 1,
        totalListings: 2,
        totalActiveListings: 2,
      },
    ]);
    console.log('   → 2 seller profiles');

    // ── 3. UserPreferences ───────────────────────────────────────────────────
    console.log('⚙️  Seeding user preferences...');
    await UserPreference.insertMany([
      {
        account: user1._id,
        school: 'Đại học FPT Hà Nội',
        preferredArea: 'Thạch Hòa, Thạch Thất',
        minPrice: 2000000,
        maxPrice: 4000000,
        roomType: 'single',
        maxOccupants: 1,
        moveInDate: daysFromNow(7),
        desiredAmenities: ['ac', 'water_heater', 'wifi', 'fridge'],
      },
      {
        account: user2._id,
        school: 'Đại học Quốc gia Hà Nội',
        preferredArea: 'Tân Xã, Thạch Thất',
        minPrice: 1500000,
        maxPrice: 3500000,
        roomType: 'shared',
        maxOccupants: 2,
        moveInDate: daysFromNow(14),
        desiredAmenities: ['wifi', 'water_heater'],
      },
    ]);
    console.log('   → 2 user preferences');

    // ── 4. Properties ────────────────────────────────────────────────────────
    console.log('🏘️  Seeding properties...');
    const [prop1, prop2, prop3] = await Property.insertMany([
      {
        seller: seller1._id,
        name: 'Nhà Trọ Lê Sơn – Bến Trung',
        description: 'Khu nhà trọ mới xây, đầy đủ tiện nghi, nằm ngay cạnh Đại học FPT và ĐHQG Hà Nội.',
        addressLine: 'Khu Bến Trung',
        ward: 'Thạch Hòa',
        district: 'Thạch Thất',
        province: 'Hà Nội',
        location: { type: 'Point', coordinates: [105.5247, 21.0133] },
        imageUrls: ['/images/properties/prop1_1.jpg', '/images/properties/prop1_2.jpg'],
        commonAmenities: ['parking', 'security_camera', 'wifi', 'water_tank'],
        isActive: true,
      },
      {
        seller: seller1._id,
        name: 'Căn Hộ Mini Cầu Bươu – Thạch Thất',
        description: 'Chung cư mini vị trí trung tâm Hòa Lạc, gần hồ Tân Xã, thuận tiện di chuyển tới khu CNC.',
        addressLine: 'Đường Tân Xã',
        ward: 'Tân Xã',
        district: 'Thạch Thất',
        province: 'Hà Nội',
        location: { type: 'Point', coordinates: [105.5012, 21.0251] },
        imageUrls: ['/images/properties/prop2_1.jpg'],
        commonAmenities: ['elevator', 'parking', 'security_camera', 'wifi'],
        isActive: true,
      },
      {
        seller: seller2._id,
        name: 'Tòa Nhà Hoàng Thủy – Đại lộ Thăng Long',
        description: 'Căn hộ dịch vụ cao cấp trục đại lộ Thăng Long, thang máy tốc độ cao, hồ bơi sân vườn.',
        addressLine: 'Trục Đại lộ Thăng Long kéo dài',
        ward: 'Thạch Hòa',
        district: 'Thạch Thất',
        province: 'Hà Nội',
        location: { type: 'Point', coordinates: [105.5380, 21.0089] },
        imageUrls: ['/images/properties/prop3_1.jpg', '/images/properties/prop3_2.jpg'],
        commonAmenities: ['elevator', 'pool', 'gym', 'parking', 'security_24h', 'wifi'],
        isActive: true,
      },
    ]);
    console.log('   → 3 properties');

    // ── 5. Rooms ─────────────────────────────────────────────────────────────
    console.log('🛏️  Seeding rooms...');
    const [room1, room2, room3, room4, room5, room6] = await Room.insertMany([
      {
        property: prop1._id,
        seller: seller1._id,
        name: 'Phòng 101',
        roomType: 'single',
        area: 28,
        maxOccupants: 2,
        price: 3200000,
        deposit: 6400000,
        electricityRate: 3500,
        waterRate: 15000,
        internetFee: 100000,
        parkingFee: 100000,
        amenities: ['ac', 'water_heater', 'fridge', 'cooking_shelf', 'balcony'],
        furniture: ['bed', 'wardrobe', 'desk', 'chair'],
        rules: 'Không nuôi thú cưng. Ra vào tự do bằng vân tay. Không gây ồn sau 23h.',
        imageUrls: ['/images/rooms/room1_1.jpg', '/images/rooms/room1_2.jpg'],
        status: 'available',
        isActive: true,
      },
      {
        property: prop1._id,
        seller: seller1._id,
        name: 'Phòng 201',
        roomType: 'single',
        area: 28,
        maxOccupants: 2,
        price: 3200000,
        deposit: 6400000,
        electricityRate: 3500,
        waterRate: 15000,
        internetFee: 100000,
        parkingFee: 100000,
        amenities: ['ac', 'water_heater', 'fridge', 'washing_machine', 'balcony'],
        furniture: ['bed', 'wardrobe', 'desk', 'chair'],
        rules: 'Không nuôi thú cưng. Ra vào tự do bằng vân tay. Không gây ồn sau 23h.',
        imageUrls: ['/images/rooms/room2_1.jpg'],
        status: 'rented',
        isActive: true,
      },
      {
        property: prop2._id,
        seller: seller1._id,
        name: 'Căn 305',
        roomType: 'mini_apartment',
        area: 35,
        maxOccupants: 2,
        price: 3800000,
        deposit: 3800000,
        electricityRate: 3500,
        waterRate: 15000,
        internetFee: 100000,
        parkingFee: 150000,
        amenities: ['ac', 'water_heater', 'fridge', 'washing_machine', 'balcony'],
        furniture: ['bed', 'wardrobe', 'desk', 'sofa', 'tv'],
        rules: 'Đóng cửa sau 23h. Không tụ tập đông người. Giữ vệ sinh chung.',
        imageUrls: ['/images/rooms/room3_1.jpg', '/images/rooms/room3_2.jpg'],
        videoUrl: '/videos/room3_tour.mp4',
        status: 'available',
        isActive: true,
      },
      {
        property: prop2._id,
        seller: seller1._id,
        name: 'Phòng Studio 102',
        roomType: 'single',
        area: 20,
        maxOccupants: 1,
        price: 1800000,
        deposit: 1800000,
        electricityRate: 3000,
        waterRate: 15000,
        internetFee: 100000,
        parkingFee: 80000,
        amenities: ['water_heater', 'cooking_shelf'],
        furniture: ['bed', 'wardrobe'],
        rules: 'Giờ giấc tự do. Không gây ồn.',
        imageUrls: ['/images/rooms/room4_1.jpg'],
        status: 'available',
        isActive: true,
      },
      {
        property: prop3._id,
        seller: seller2._id,
        name: 'Suite 402 – View Đại Lộ',
        roomType: 'apartment',
        area: 40,
        maxOccupants: 2,
        price: 5500000,
        deposit: 11000000,
        electricityRate: 3500,
        waterRate: 15000,
        internetFee: 0,
        parkingFee: 200000,
        amenities: ['ac', 'water_heater', 'fridge', 'washing_machine', 'smart_tv', 'induction_cooker'],
        furniture: ['bed', 'wardrobe', 'sofa', 'dining_table', 'smart_home_system'],
        rules: 'Không hút thuốc trong phòng. Khách không ở qua đêm.',
        imageUrls: ['/images/rooms/room5_1.jpg', '/images/rooms/room5_2.jpg', '/images/rooms/room5_3.jpg'],
        videoUrl: '/videos/room5_tour.mp4',
        status: 'available',
        isActive: true,
      },
      {
        property: prop3._id,
        seller: seller2._id,
        name: 'Phòng 101 – Tiêu chuẩn',
        roomType: 'single',
        area: 18,
        maxOccupants: 1,
        price: 1500000,
        deposit: 1500000,
        electricityRate: 3000,
        waterRate: 15000,
        internetFee: 100000,
        parkingFee: 80000,
        amenities: ['water_heater', 'ceiling_fan'],
        furniture: ['bed', 'wardrobe', 'desk'],
        rules: 'Không hút thuốc. Không nấu ăn trong phòng.',
        imageUrls: ['/images/rooms/room6_1.jpg'],
        status: 'available',
        isActive: true,
      },
    ]);
    console.log('   → 6 rooms');

    // ── 6. Listings ──────────────────────────────────────────────────────────
    console.log('📋 Seeding listings...');
    const now = new Date();
    const [lst1, lst2, lst3, lst4, lst5, lst6] = await Listing.insertMany([
      {
        room: room1._id,
        property: prop1._id,
        seller: seller1._id,
        title: 'Căn Hộ Studio Cao Cấp Gần Đại Học FPT – Bến Trung',
        description:
          'Phòng trọ khép kín mới 100% tại khu Bến Trung, Thạch Hòa. Cực gần FPT, ĐHQG. Đầy đủ nội thất: giường tủ, điều hòa Inverter, tủ lạnh, bếp từ. Có khu để xe rộng rãi, bảo vệ 24/7.',
        price: 3200000,
        deposit: 6400000,
        area: 28,
        roomType: 'single',
        addressLine: 'Khu Bến Trung',
        ward: 'Thạch Hòa',
        district: 'Thạch Thất',
        province: 'Hà Nội',
        location: { type: 'Point', coordinates: [105.5247, 21.0133] },
        amenities: ['ac', 'water_heater', 'fridge', 'cooking_shelf', 'balcony', 'wifi', 'parking'],
        imageUrls: ['/images/rooms/room1_1.jpg', '/images/rooms/room1_2.jpg'],
        status: 'approved',
        reviewedBy: admin._id,
        reviewedAt: daysFromNow(-10),
        expiresAt: daysFromNow(60),
        availableFrom: now,
        viewCount: 312,
        saveCount: 28,
        contactCount: 15,
        appointmentCount: 6,
      },
      {
        room: room2._id,
        property: prop1._id,
        seller: seller1._id,
        title: 'Phòng Khép Kín Có Máy Giặt Riêng – Bến Trung Hòa Lạc',
        description:
          'Phòng trọ tầng 2 thoáng mát có ban công riêng. Máy giặt riêng, điều hòa Inverter. Khóa vân tay, camera an ninh. Giờ giấc tự do.',
        price: 3200000,
        deposit: 6400000,
        area: 28,
        roomType: 'single',
        addressLine: 'Khu Bến Trung',
        ward: 'Thạch Hòa',
        district: 'Thạch Thất',
        province: 'Hà Nội',
        location: { type: 'Point', coordinates: [105.5248, 21.0134] },
        amenities: ['ac', 'water_heater', 'fridge', 'washing_machine', 'balcony', 'wifi'],
        imageUrls: ['/images/rooms/room2_1.jpg'],
        status: 'approved',
        reviewedBy: admin._id,
        reviewedAt: daysFromNow(-10),
        expiresAt: daysFromNow(60),
        availableFrom: daysFromNow(7), // đang có người ở, trống sau 7 ngày
        viewCount: 189,
        saveCount: 14,
        contactCount: 8,
        appointmentCount: 3,
      },
      {
        room: room3._id,
        property: prop2._id,
        seller: seller1._id,
        title: 'Chung Cư Mini Full Đồ Tân Xã – Gần Hồ Tân Xã',
        description:
          'Căn hộ mini thiết kế hiện đại, cách hồ Tân Xã 200m. Ban công riêng, ánh sáng tự nhiên. Điều hòa, máy giặt, tủ lạnh, sofa, TV sẵn.',
        price: 3800000,
        deposit: 3800000,
        area: 35,
        roomType: 'mini_apartment',
        addressLine: 'Đường Tân Xã',
        ward: 'Tân Xã',
        district: 'Thạch Thất',
        province: 'Hà Nội',
        location: { type: 'Point', coordinates: [105.5012, 21.0251] },
        amenities: ['ac', 'water_heater', 'fridge', 'washing_machine', 'balcony', 'wifi', 'tv'],
        imageUrls: ['/images/rooms/room3_1.jpg', '/images/rooms/room3_2.jpg'],
        videoUrl: '/videos/room3_tour.mp4',
        status: 'approved',
        reviewedBy: admin._id,
        reviewedAt: daysFromNow(-8),
        expiresAt: daysFromNow(55),
        availableFrom: now,
        isPinned: true,
        pinnedUntil: daysFromNow(7),
        viewCount: 540,
        saveCount: 47,
        contactCount: 22,
        appointmentCount: 11,
      },
      {
        room: room4._id,
        property: prop2._id,
        seller: seller1._id,
        title: 'Phòng Trọ Giá Rẻ Dành Cho Sinh Viên – Tân Xã Hòa Lạc',
        description:
          'Phòng gác xép khép kín giá học sinh sinh viên. Điện nước giá nhà nước. Khóa cổng vân tay, chỗ để xe miễn phí. Chủ nhà thân thiện.',
        price: 1800000,
        deposit: 1800000,
        area: 20,
        roomType: 'single',
        addressLine: 'Đường Tân Xã',
        ward: 'Tân Xã',
        district: 'Thạch Thất',
        province: 'Hà Nội',
        location: { type: 'Point', coordinates: [105.5015, 21.0255] },
        amenities: ['water_heater', 'cooking_shelf', 'wifi', 'parking'],
        imageUrls: ['/images/rooms/room4_1.jpg'],
        status: 'approved',
        reviewedBy: admin._id,
        reviewedAt: daysFromNow(-5),
        expiresAt: daysFromNow(58),
        availableFrom: now,
        viewCount: 260,
        saveCount: 19,
        contactCount: 11,
        appointmentCount: 4,
      },
      {
        room: room5._id,
        property: prop3._id,
        seller: seller2._id,
        title: 'Căn Hộ Dịch Vụ Cao Cấp View Đại Lộ Thăng Long',
        description:
          'Studio Suite sang trọng, Smart Home đẳng cấp châu Âu. Tòa nhà có hồ bơi, gym, thang máy tốc độ cao. An ninh bảo vệ 24/7. Nội thất cao cấp.',
        price: 5500000,
        deposit: 11000000,
        area: 40,
        roomType: 'apartment',
        addressLine: 'Trục Đại lộ Thăng Long kéo dài',
        ward: 'Thạch Hòa',
        district: 'Thạch Thất',
        province: 'Hà Nội',
        location: { type: 'Point', coordinates: [105.5380, 21.0089] },
        amenities: ['ac', 'water_heater', 'fridge', 'washing_machine', 'smart_tv', 'induction_cooker', 'wifi', 'gym', 'pool', 'parking'],
        imageUrls: ['/images/rooms/room5_1.jpg', '/images/rooms/room5_2.jpg', '/images/rooms/room5_3.jpg'],
        videoUrl: '/videos/room5_tour.mp4',
        status: 'approved',
        reviewedBy: admin._id,
        reviewedAt: daysFromNow(-12),
        expiresAt: daysFromNow(50),
        availableFrom: now,
        isBoosted: true,
        boostedUntil: daysFromNow(3),
        viewCount: 780,
        saveCount: 62,
        contactCount: 30,
        appointmentCount: 14,
      },
      {
        room: room6._id,
        property: prop3._id,
        seller: seller2._id,
        title: 'Phòng Trọ Khép Kín Tiêu Chuẩn – Gần Ngã Tư Lục Quân',
        description:
          'Phòng trọ khép kín trong khu dân cư yên tĩnh, an ninh tốt. Giá điện nước bình dân. Chủ nhà thân thiện, sẵn sàng hỗ trợ sinh viên năm nhất.',
        price: 1500000,
        deposit: 1500000,
        area: 18,
        roomType: 'single',
        addressLine: 'Gần Ngã tư Lục Quân',
        ward: 'Cổ Đông',
        district: 'Thạch Thất',
        province: 'Hà Nội',
        location: { type: 'Point', coordinates: [105.5350, 21.0210] },
        amenities: ['water_heater', 'ceiling_fan', 'wifi'],
        imageUrls: ['/images/rooms/room6_1.jpg'],
        status: 'pending', // tin đang chờ duyệt (để test flow kiểm duyệt)
        availableFrom: now,
        viewCount: 0,
        saveCount: 0,
        contactCount: 0,
        appointmentCount: 0,
      },
    ]);
    console.log('   → 6 listings (5 approved, 1 pending)');

    // ── 7. Appointments ──────────────────────────────────────────────────────
    console.log('📅 Seeding appointments...');
    await Appointment.insertMany([
      {
        listing: lst1._id,
        room: room1._id,
        user: user1._id,
        seller: seller1._id,
        scheduledAt: daysFromNow(2),
        status: 'pending',
        userNote: 'Em có thể xem phòng vào buổi sáng không anh?',
      },
      {
        listing: lst3._id,
        room: room3._id,
        user: user1._id,
        seller: seller1._id,
        scheduledAt: daysFromNow(-1),
        status: 'confirmed',
        userNote: 'Em muốn xem phòng cùng 1 người bạn.',
        sellerNote: 'Khách tiềm năng, có thể ký ngay.',
      },
      {
        listing: lst5._id,
        room: room5._id,
        user: user2._id,
        seller: seller2._id,
        scheduledAt: daysFromNow(1),
        status: 'proposed',
        proposedAt: daysFromNow(3),
        proposedNote: 'Chị bận ngày 24, mình dời qua 26/6 được không em?',
        userNote: 'Em muốn xem trước 30/6.',
      },
      {
        listing: lst4._id,
        room: room4._id,
        user: user3._id,
        seller: seller1._id,
        scheduledAt: daysFromNow(-5),
        status: 'completed',
        userNote: 'Em có thể đến chiều không anh?',
        sellerNote: 'Khách xem xong chưa quyết định.',
        userRating: 5,
        userFeedback: 'Anh chủ nhà nhiệt tình, phòng sạch đúng ảnh.',
      },
      {
        listing: lst2._id,
        room: room2._id,
        user: user2._id,
        seller: seller1._id,
        scheduledAt: daysFromNow(-3),
        status: 'cancelled',
        cancelledBy: 'user',
        cancelReason: 'Em bận đột xuất, xin lỗi anh.',
      },
    ]);
    console.log('   → 5 appointments');

    // ── 8. Conversations & Messages ──────────────────────────────────────────
    console.log('💬 Seeding conversations & messages...');

    const [conv1, conv2] = await Conversation.insertMany([
      {
        listing: lst1._id,
        user: user1._id,
        seller: seller1._id,
        lastMessage: 'Được chứ, anh hỗ trợ cọc 1.5 tháng nếu ký 1 năm.',
        lastMessageAt: daysFromNow(-1),
        unreadByUser: 1,
        unreadBySeller: 0,
      },
      {
        listing: lst3._id,
        user: user2._id,
        seller: seller1._id,
        lastMessage: 'Máy giặt riêng đầy đủ, điều hòa mới, chỗ để xe miễn phí em nhé.',
        lastMessageAt: daysFromNow(-2),
        unreadByUser: 0,
        unreadBySeller: 0,
      },
    ]);

    await Message.insertMany([
      // Conv1: user1 hỏi seller1 về listing1
      {
        conversation: conv1._id,
        sender: user1._id,
        type: 'text',
        text: 'Chào anh Sơn, em thấy tin đăng căn studio Bến Trung gần FPT. Phòng hiện còn trống không ạ?',
        isRead: true,
      },
      {
        conversation: conv1._id,
        sender: seller1._id,
        type: 'text',
        text: 'Chào em Hải, phòng 101 vẫn còn trống. Vị trí rất tiện, đi FPT chỉ 5 phút thôi.',
        isRead: true,
      },
      {
        conversation: conv1._id,
        sender: user1._id,
        type: 'text',
        text: 'Dạ tiền cọc bao nhiêu tháng vậy anh?',
        isRead: true,
      },
      {
        conversation: conv1._id,
        sender: seller1._id,
        type: 'text',
        text: 'Bên anh cọc 2 tháng. Nếu ký hợp đồng 1 năm thì anh hỗ trợ 1.5 tháng em nhé.',
        isRead: true,
      },
      {
        conversation: conv1._id,
        sender: seller1._id,
        type: 'listing_share',
        text: 'Anh gửi em thêm ảnh phòng mới nhất nha.',
        sharedListing: lst1._id,
        isRead: false, // unreadByUser = 1
      },

      // Conv2: user2 hỏi seller1 về listing3
      {
        conversation: conv2._id,
        sender: user2._id,
        type: 'text',
        text: 'Anh ơi căn mini Tân Xã giá 3.8 triệu có máy giặt riêng không anh?',
        isRead: true,
      },
      {
        conversation: conv2._id,
        sender: seller1._id,
        type: 'text',
        text: 'Máy giặt riêng đầy đủ, điều hòa mới, chỗ để xe miễn phí em nhé.',
        isRead: true,
      },
    ]);
    console.log('   → 2 conversations, 7 messages');

    // ── 9. Service Packages ──────────────────────────────────────────────────
    console.log('📦 Seeding service packages...');
    const [pkgUserFree, pkgUserFastMatch, pkgSellerFree, pkgSellerBasic, pkgSellerPro, pkgSellerPremium] =
      await ServicePackage.insertMany([
        // User packages
        {
          name: 'User Free',
          code: 'user_free',
          targetRole: 'user',
          price: 0,
          durationDays: 36500, // vĩnh viễn
          hasFastMatch: false,
          maxDailyContacts: 5,
          description: 'Gói miễn phí dành cho người tìm trọ.',
          features: ['Tìm kiếm & xem phòng', 'Lưu 10 phòng yêu thích', 'Đặt lịch xem phòng', 'Nhắn tin với chủ trọ'],
          isActive: true,
          sortOrder: 1,
        },
        {
          name: 'Fast Match',
          code: 'user_fast_match',
          targetRole: 'user',
          price: 99000,
          durationDays: 30,
          hasFastMatch: true,
          maxDailyContacts: null,
          description: 'Tìm phòng nhanh hơn, ưu tiên lịch hẹn.',
          features: [
            'Tất cả quyền lợi Free',
            'Ưu tiên lịch hẹn xem phòng',
            'Gợi ý phòng phù hợp nhất',
            'Liên hệ không giới hạn',
            'Huy hiệu Fast Match nổi bật',
          ],
          isHighlighted: true,
          isActive: true,
          sortOrder: 2,
        },
        // Seller packages
        {
          name: 'Seller Free',
          code: 'seller_free',
          targetRole: 'seller',
          price: 0,
          durationDays: 36500,
          maxListings: 2,
          maxProperties: 1,
          boostCredits: 0,
          pinCredits: 0,
          refreshCredits: 0,
          description: 'Bắt đầu đăng tin hoàn toàn miễn phí.',
          features: ['2 tin đăng hoạt động', '1 nhà trọ', 'Quản lý lịch hẹn', 'Chat với khách thuê'],
          isActive: true,
          sortOrder: 3,
        },
        {
          name: 'Basic',
          code: 'seller_basic',
          targetRole: 'seller',
          price: 199000,
          durationDays: 30,
          maxListings: 5,
          maxProperties: 2,
          boostCredits: 3,
          pinCredits: 1,
          refreshCredits: 5,
          description: 'Phù hợp cho chủ trọ nhỏ.',
          features: ['5 tin đăng hoạt động', '2 nhà trọ', '3 lượt đẩy tin', '1 lượt ghim tin', 'Thống kê cơ bản'],
          isActive: true,
          sortOrder: 4,
        },
        {
          name: 'Pro',
          code: 'seller_pro',
          targetRole: 'seller',
          price: 499000,
          durationDays: 30,
          maxListings: 15,
          maxProperties: 5,
          boostCredits: 10,
          pinCredits: 3,
          refreshCredits: 15,
          description: 'Dành cho chủ trọ chuyên nghiệp.',
          features: [
            '15 tin đăng hoạt động',
            '5 nhà trọ',
            '10 lượt đẩy tin',
            '3 lượt ghim tin',
            'Dashboard nâng cao',
            'Xuất báo cáo khách hàng',
          ],
          isHighlighted: true,
          isActive: true,
          sortOrder: 5,
        },
        {
          name: 'Premium',
          code: 'seller_premium',
          targetRole: 'seller',
          price: 999000,
          durationDays: 30,
          maxListings: null, // không giới hạn
          maxProperties: null,
          boostCredits: 30,
          pinCredits: 10,
          refreshCredits: 30,
          description: 'Tối ưu cho chủ trọ quy mô lớn.',
          features: [
            'Tin đăng không giới hạn',
            'Nhà trọ không giới hạn',
            '30 lượt đẩy tin',
            '10 lượt ghim tin',
            'Hỗ trợ ưu tiên 24/7',
            'Tất cả tính năng Pro',
          ],
          isActive: true,
          sortOrder: 6,
        },
      ]);
    console.log('   → 6 service packages');

    // ── 10. Transactions & Subscriptions ─────────────────────────────────────
    console.log('💳 Seeding transactions & subscriptions...');

    const txn1 = await Transaction.create({
      account: seller1._id,
      servicePackage: pkgSellerPro._id,
      amount: 499000,
      description: 'Mua gói Pro tháng 6/2026',
      paymentGateway: 'payos',
      orderCode: 202606001,
      paymentMethod: 'bank_transfer',
      status: 'success',
      paidAt: daysFromNow(-15),
    });

    const txn2 = await Transaction.create({
      account: seller2._id,
      servicePackage: pkgSellerBasic._id,
      amount: 199000,
      description: 'Mua gói Basic tháng 6/2026',
      paymentGateway: 'payos',
      orderCode: 202606002,
      paymentMethod: 'qr',
      status: 'success',
      paidAt: daysFromNow(-10),
    });

    await Subscription.insertMany([
      {
        account: seller1._id,
        servicePackage: pkgSellerPro._id,
        transaction: txn1._id,
        startedAt: daysFromNow(-15),
        expiresAt: daysFromNow(15),
        status: 'active',
        remainingListings: null,
        remainingBoostCredits: 7,
        remainingPinCredits: 2,
        remainingRefreshCredits: 12,
        finalPrice: 499000,
      },
      {
        account: seller2._id,
        servicePackage: pkgSellerBasic._id,
        transaction: txn2._id,
        startedAt: daysFromNow(-10),
        expiresAt: daysFromNow(20),
        status: 'active',
        remainingListings: 3,
        remainingBoostCredits: 2,
        remainingPinCredits: 1,
        remainingRefreshCredits: 4,
        finalPrice: 199000,
      },
    ]);
    console.log('   → 2 transactions, 2 subscriptions');

    // ── 11. Notifications ────────────────────────────────────────────────────
    console.log('🔔 Seeding notifications...');
    await Notification.insertMany([
      {
        recipient: user1._id,
        type: 'appointment_confirmed',
        title: 'Lịch hẹn xem phòng đã được xác nhận',
        body: 'Chủ trọ đã xác nhận lịch xem căn Studio Bến Trung vào ngày mai 9:00 sáng.',
        entityType: 'appointment',
        isRead: false,
      },
      {
        recipient: user1._id,
        type: 'message_new',
        title: 'Tin nhắn mới từ Lê Hùng Sơn',
        body: 'Anh gửi em thêm ảnh phòng mới nhất nha.',
        entityType: 'conversation',
        entityId: conv1._id,
        isRead: false,
      },
      {
        recipient: user2._id,
        type: 'appointment_proposed',
        title: 'Chủ trọ đề xuất thay đổi lịch hẹn',
        body: 'Hoàng Thu Thủy muốn dời lịch xem Suite 402 sang ngày 26/6. Bạn có đồng ý không?',
        entityType: 'appointment',
        isRead: false,
      },
      {
        recipient: seller1._id,
        type: 'listing_approved',
        title: 'Tin đăng đã được phê duyệt',
        body: 'Tin "Căn Hộ Studio Cao Cấp Gần Đại Học FPT – Bến Trung" đã được Admin phê duyệt.',
        entityType: 'listing',
        entityId: lst1._id,
        isRead: true,
      },
      {
        recipient: seller1._id,
        type: 'appointment_new',
        title: 'Khách hàng đặt lịch xem phòng mới',
        body: 'Nguyễn Văn Hải muốn xem phòng 101 vào ngày 25/6 lúc 9:00. Vui lòng xác nhận.',
        entityType: 'appointment',
        isRead: false,
      },
      {
        recipient: seller2._id,
        type: 'subscription_activated',
        title: 'Gói Basic đã được kích hoạt',
        body: 'Gói dịch vụ Basic của bạn đã kích hoạt thành công. Có hiệu lực đến ngày 13/7/2026.',
        entityType: 'subscription',
        isRead: true,
      },
      {
        recipient: seller2._id,
        type: 'listing_approved',
        title: 'Tin đăng đã được phê duyệt',
        body: 'Tin "Căn Hộ Dịch Vụ Cao Cấp View Đại Lộ Thăng Long" đã được Admin phê duyệt.',
        entityType: 'listing',
        entityId: lst5._id,
        isRead: true,
      },
    ]);
    console.log('   → 7 notifications');

    // ── 12. Favorites ────────────────────────────────────────────────────────
    console.log('❤️  Seeding favorites...');
    await Favorite.insertMany([
      { user: user1._id, listing: lst3._id },
      { user: user1._id, listing: lst5._id },
      { user: user2._id, listing: lst1._id },
      { user: user3._id, listing: lst3._id },
      { user: user3._id, listing: lst4._id },
    ]);
    console.log('   → 5 favorites');

    // ── 13. ViewHistory ──────────────────────────────────────────────────────
    console.log('👁️  Seeding view history...');
    await ViewHistory.insertMany([
      { user: user1._id, listing: lst1._id, viewCount: 3 },
      { user: user1._id, listing: lst3._id, viewCount: 5 },
      { user: user1._id, listing: lst5._id, viewCount: 2 },
      { user: user2._id, listing: lst3._id, viewCount: 4 },
      { user: user2._id, listing: lst5._id, viewCount: 6 },
      { user: user3._id, listing: lst4._id, viewCount: 2 },
    ]);
    console.log('   → 6 view history entries');

    // ── 14. SavedSearch ──────────────────────────────────────────────────────
    console.log('🔍 Seeding saved searches...');
    await SavedSearch.insertMany([
      {
        user: user1._id,
        name: 'Phòng gần FPT giá 2-4tr',
        filters: {
          area: 'Thạch Thất',
          minPrice: 2000000,
          maxPrice: 4000000,
          roomType: 'single',
        },
        notifyEnabled: true,
      },
      {
        user: user2._id,
        name: 'Căn hộ mini Hòa Lạc',
        filters: {
          district: 'Thạch Thất',
          province: 'Hà Nội',
          roomType: 'mini_apartment',
          maxPrice: 4500000,
        },
        notifyEnabled: true,
      },
    ]);
    console.log('   → 2 saved searches');

    // ── 15. Report ───────────────────────────────────────────────────────────
    console.log('🚩 Seeding reports...');
    await Report.insertMany([
      {
        reporter: user3._id,
        entityType: 'listing',
        entityId: lst6._id,
        reason: 'wrong_info',
        description: 'Ảnh phòng không khớp với thực tế, phòng nhỏ hơn rất nhiều.',
        status: 'pending',
      },
    ]);
    console.log('   → 1 report');

    // ── 16. Payments ──────────────────────────────────────────────────────────
    console.log('💳 Seeding room payments (rent bills)...');
    await Payment.insertMany([
      {
        title: 'Tiền thuê phòng tháng 6/2026',
        roomTitle: 'Phòng 101 – Bến Trung',
        tenantEmail: 'user1@locafy.com',
        tenantName: 'Nguyễn Văn Hải',
        amount: 3200000,
        status: 'Chưa thanh toán'
      },
      {
        title: 'Tiền điện nước tháng 5/2026',
        roomTitle: 'Phòng 101 – Bến Trung',
        tenantEmail: 'user1@locafy.com',
        tenantName: 'Nguyễn Văn Hải',
        amount: 450000,
        status: 'Đã thanh toán',
        paymentMethod: 'Tiền mặt'
      },
      {
        title: 'Tiền đặt cọc giữ phòng',
        roomTitle: 'Căn 305 – Hồ Tân Xã',
        tenantEmail: 'user2@locafy.com',
        tenantName: 'Trần Thị Mai',
        amount: 3800000,
        status: 'Chưa thanh toán'
      }
    ]);
    console.log('   → 3 room payments');

    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n✅ Seeding hoàn tất!\n');
    console.log('─── Tài khoản mặc định (mật khẩu: 123456) ───────────────────');
    console.log('  User 1  :  user1@locafy.com');
    console.log('  User 2  :  user2@locafy.com');
    console.log('  User 3  :  user3@locafy.com');
    console.log('  Seller 1:  seller1@locafy.com  (gói Pro, đã xác minh)');
    console.log('  Seller 2:  seller2@locafy.com  (gói Basic, đã xác minh)');
    console.log('  Admin   :  admin@locafy.com');
    console.log('──────────────────────────────────────────────────────────────\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding thất bại:', error);
    process.exit(1);
  }
}

seed();

