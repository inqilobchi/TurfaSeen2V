require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const mongoose = require('mongoose');
const Fastify = require('fastify');
const fastify = Fastify({ logger: true });
const token = process.env.BOT_TOKEN;
const apiKey = process.env.API_KEY;
const mongoUri = process.env.MONGO_URI;
const adminId = process.env.ADMIN_ID;
const bot = new TelegramBot(token, { webHook: true });

const WEBHOOK_PATH = `/webhook/${token}`;
const FULL_WEBHOOK_URL = `${process.env.PUBLIC_URL}${WEBHOOK_PATH}`;


fastify.post(WEBHOOK_PATH, (req, reply) => {
  try {
    bot.processUpdate(req.body);  
    console.log('Update processed:', req.body);
    reply.code(200).send();       
  } catch (error) {
    console.error('Error processing update:', error);
    reply.sendStatus(500);
  }
});

fastify.get('/healthz', (req, reply) => {
  reply.send({ status: 'ok' });
});

fastify.listen({ port: process.env.PORT || 3000, host: '0.0.0.0' }, async (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }

  fastify.log.info(`Server listening at ${address}`);

  try {
const response = await axios.post(`https://api.telegram.org/bot${token}/setWebhook`, null, {
  params: { url: FULL_WEBHOOK_URL }
});

    if (response.data.ok) {
      fastify.log.info('Webhook successfully set:', response.data);
    } else {
      fastify.log.error('Failed to set webhook:', response.data);
    }
  } catch (error) {
    fastify.log.error('Error setting webhook:', error.message);
  }
});

mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("✅ MongoDB ulandi"))
  .catch(err => console.error("❌ MongoDB ulanish xatosi:", err));

const userSchema = new mongoose.Schema({
  userId: { type: Number, required: true, unique: true },
  name: { type: String },
  balance: { type: Number, default: 0 }
});

const User = mongoose.model('User', userSchema);

const menu = [
  [{ text: "🛍 Buyurtma berish" }],
  [{ text: "👤 Hisobim" }, { text: "💎 Pul kiritish" }],
  [{ text: "📚 Bot haqida" }, { text: "🔖 Buyurtmalar" }]
];

const orderState = {};
const payState = {};
const adminState = {};
bot.on('message', async (msg) => {
  const chatId = msg.from.id;
  const name = msg.from.first_name;
  const text = msg.text;

  if (text === "/start") {
    try {
      let user = await User.findOne({ userId: chatId });
      if (!user) {
        user = new User({ userId: chatId, name });
        await user.save();
      }
    } catch (err) {
      console.error(err);
    }

    await bot.sendPhoto(chatId,
      "https://img.freepik.com/premium-photo/concept-social-media-marketing-smm-abstract-holographic-image-with-icons_102583-6813.jpg",
      {
        caption: `<b>Assalomu alaykum <a href="tg://user?id=${chatId}">${name}</a>!</b>\n\nBot orqali obunachi, ko‘rish, reaksiya, izoh va boshqa xizmatlarga buyurtma bera olasiz ✅`,
        parse_mode: 'HTML',
        reply_markup: {
          keyboard: menu,
          resize_keyboard: true
        }
      }
    );
  }

  if (text === "👤 Hisobim") {
    const user = await User.findOne({ userId: chatId });
    if (!user) return bot.sendMessage(chatId, "❌ Sizning profilingiz topilmadi. /start ni bosing.");

    await bot.sendMessage(chatId, `
👤 <b>Sizning profilingiz</b>
━━━━━━━━━━━━━━
🪪 ID: <code>${user.userId}</code>
🎈 Ism: ${user.name}
💰 Balans: <b>${user.balance.toFixed(2)} so'm</b>
━━━━━━━━━━━━━━
    `, { parse_mode: "HTML" });
  }

  if (text === "📚 Bot haqida") {
    await bot.sendMessage(chatId, `<b>Bugungi raqamli davrda ijtimoiy tarmoqlarda faol bo‘lish – har qanday biznes va shaxsiy brend uchun muhim omil hisoblanadi. Sizning sahifangiz yoki profilingiz qancha ko‘p ko‘rilsa, brendingiz shunchalik ko‘proq e’tibor va ishonch qozonadi. Biz sizga bu jarayonni oson va samarali qiladigan professional yechimni taklif qilamiz.

Bizning platformamiz yordamida:

Profilingiz va sahifalaringiz tez va organik tarzda rivojlanadi.

Postlaringiz ko‘proq auditoriya tomonidan ko‘riladi, like va izohlar soni oshadi.

Kuzatuvchilar va mijozlar bazangiz barqaror o‘sadi.

Kontentingiz to‘g‘ri strategiya asosida targ‘ib qilinadi, bu esa sizning onlayn imidjingizni mustahkamlaydi.

Ijtimoiy tarmoqlarda muvaffaqiyatli bo‘lish – endi faqat sizning qo‘lingizda. Platformamiz sizga vaqtni tejash va natijani tezroq ko‘rish imkonini beradi. Har bir post, har bir story va har bir reklama kampaniyasi sizga maksimal e’tibor olib keladi.

Bugun ro‘yxatdan o‘ting va onlayn mavjudligingizni yangi, ilg‘or darajaga olib chiqing. Sizning brendingizga ko‘proq kuzatuvchilar, ko‘proq imkoniyatlar va ko‘proq muvaffaqiyatlar kerakmi? Biz bilan bu endi mumkin!</b>`, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: "🐾 Dasturchi", url: "https://t.me/inqiIob" }],
          [{ text: "🌿 Hamkorimiz", url: "https://t.me/TurfaSeenBot?start=user19" }]
        ]
      }
    });
  }
  if (text === "💎 Pul kiritish") {
    await bot.sendMessage(chatId, `<b>To'lov turini tanlang:</b>`,{
      parse_mode : 'HTML',
      reply_markup : { 
        inline_keyboard : [
          [{text : "📍CLICK", callback_data : "click_pay"}]
        ]
      }
    });
  }

  if (payState[chatId]?.step === 'amount') {
    const amount = parseInt(text);
    if (isNaN(amount) || amount < 5000 || amount > 50000) {
      return bot.sendMessage(chatId, "❌ Iltimos, 5000 - 50000 so'm orasida miqdor kiriting.");
    }
    payState[chatId].amount = amount;
    payState[chatId].step = 'photo';
    return bot.sendMessage(chatId, "📸 Iltimos, to'lov chekining suratini yuboring (faqat rasm):");
  }

  if (payState[chatId]?.step === 'photo' && msg.photo) {
    const fileId = msg.photo[msg.photo.length - 1].file_id; 
    const amount = payState[chatId].amount;

    await bot.sendMessage(chatId, `✅ To'lov so'rovingiz qabul qilindi. Admin tekshiradi.`);

    await bot.sendPhoto(adminId, fileId, {
      caption: `💰 To'lov miqdori: ${amount} so'm\nFoydalanuvchi: ${name} (ID: ${chatId})`,
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Tasdiqlash", callback_data: `pay_accept_${chatId}_${amount}` },
            { text: "❌ Bekor qilish", callback_data: `pay_cancel_${chatId}_${amount}` }
          ]
        ]
      }
    });

    delete payState[chatId];
  } else if (payState[chatId]?.step === 'photo' && !msg.photo) {
    return bot.sendMessage(chatId, "❌ Iltimos, faqat rasm yuboring.");
  }
  if (text === "🔖 Buyurtmalar") {
    orderState[chatId] = { type: "check_status" };
    return bot.sendMessage(chatId, "🆔 Buyurtma ID raqamini yuboring:");
  }

if (orderState[chatId]?.type === "check_status") {
  const orderId = text.trim();
  if (!/^\d+$/.test(orderId)) return bot.sendMessage(chatId, "❌ Faqat raqam kiriting.");

  const as = await bot.sendMessage(chatId, "⏳ Tekshirilmoqda...");
  setTimeout(()=> {
    bot.deleteMessage(chatId, as.message_id).catch(()=> {})
  }, 2000)
  try {
    const response = await axios.post("https://seensms.uz/api/v1", null, {
      params: { key: apiKey, action: "status", order: orderId }
    });

    const data = response.data;
    if (data.status) {

      let holatUz;
      switch (data.status.toLowerCase()) {
        case "pending":
          holatUz = "⏳ Kutmoqda";
          break;
        case "in progress":
          holatUz = "🚀 Jarayonda";
          break;
        case "completed":
          holatUz = "✅ Bajarildi";
          break;
        case "canceled":
          holatUz = "❌ Bekor qilindi";
          break;
        default:
          holatUz = data.status; 
      }

      const textMsg = `
📦 <b>Buyurtma ma'lumotlari</b>
━━━━━━━━━━━━━━
🆔 ID: <code>${orderId}</code>
🚀 Holat: ${holatUz}
━━━━━━━━━━━━━━
`;
      await bot.sendMessage(chatId, textMsg, { parse_mode: "HTML" });
    } else {
      await bot.sendMessage(chatId, `❌ Xatolik yuz berdi`);
    }
  } catch (e) {
    await bot.sendMessage(chatId, "❌ Xatolik yuz berdi");
  }
  delete orderState[chatId];
}


  if (orderState[chatId]?.type === "order_view") {
    const amount = parseInt(text);
    if (isNaN(amount)) {
      return bot.sendMessage(chatId, "❌ Iltimos faqat son kiriting. Masalan: 50");
    }
    if (amount < 50 || amount > 250) {
      return bot.sendMessage(chatId, "⚠️ Ko'rishlar buyurtmasi\n\nminimal : 50\nmaksimal : 250");
    }

    orderState[chatId] = { type: "view_link", amount };
    return bot.sendMessage(chatId, "🔗 Havolani yuboring:");
  }

  if (orderState[chatId]?.type === "view_link") {
    const link = text.trim();
    const amount = orderState[chatId].amount;
     const as = await bot.sendMessage(chatId, "⏳ Buyurtma yuborilmoqda...");
    setTimeout(() => {
      bot.deleteMessage(chatId, as.message_id).catch(()=> {})
    }, 2000)
    try {
      const response = await axios.post("https://seensms.uz/api/v1", null, {
        params: {
          key: apiKey,
          action: "add",
          service: 371, 
          link,
          quantity: amount
        }
      });

      if (response.data.order) {
        await bot.sendMessage(chatId, `✅ Buyurtma yuborildi!\n🆔 ID: <code>${response.data.order}</code>\n📦 Ko'rishlar: ${amount} ta\n🔗 Havola: ${link}`, { parse_mode: "HTML" });
      } else {
        await bot.sendMessage(chatId, `❌ Xatolik: ${JSON.stringify(response.data)}`);
      }
    } catch (err) {
      console.error(err);
      await bot.sendMessage(chatId, "❌ Xatolik yuz berdi");
    }
    delete orderState[chatId];
  }

  if (orderState[chatId]?.type === "order_reaction") {
    const amount = parseInt(text);
    if (isNaN(amount)) return bot.sendMessage(chatId, "❌ Faqat son kiriting.");
    if (amount < 10 || amount > 15) return bot.sendMessage(chatId, "⚠️ Oddiy reaksiya \n\nminimal : 10\nmaksimal : 15");

    orderState[chatId] = { type: "reaction_link", amount };
    return bot.sendMessage(chatId, "🔗 Havolani yuboring:");
  }
  if (orderState[chatId]?.type === "order_premium_reaction") {
    const amount = parseInt(text);
    if (isNaN(amount)) return bot.sendMessage(chatId, "❌ Faqat son kiriting.");
    if (amount < 10 || amount > 15) return bot.sendMessage(chatId, "⚠️ Premium reaksiya \n\nminimal : 10\nmaksimal : 15");

    orderState[chatId] = { type: "premium_reaction_link", amount };
    return bot.sendMessage(chatId, "🔗 Havolani yuboring:");
  }
  if (orderState[chatId]?.type === "reaction_link") {
    const link = text.trim();
    const amount = orderState[chatId].amount;
    const as = await bot.sendMessage(chatId, "⏳ Buyurtma yuborilmoqda...");
    setTimeout(() => {
      bot.deleteMessage(chatId, as.message_id).catch(()=> {})
    }, 2000)
    try {
      const response = await axios.post("https://seensms.uz/api/v1", null, {
        params: {
          key: apiKey,
          action: "add",
          service: 436,  
          link,
          quantity: amount
        }
      });

      if (response.data.order) {
        await bot.sendMessage(chatId, `✅ Buyurtma yuborildi!\n🆔 ID: <code>${response.data.order}</code>\n📦 Oddiy reaksiya: ${amount} ta\n🔗 Havola: ${link}`, { parse_mode: "HTML" });
      } else {
        await bot.sendMessage(chatId, `❌ Xatolik: ${JSON.stringify(response.data)}`);
      }
    } catch (err) {
      console.error(err);
      await bot.sendMessage(chatId, "❌ Xatolik yuz berdi");
    }
    delete orderState[chatId];
  }
  if (orderState[chatId]?.type === "premium_reaction_link") {
    const link = text.trim();
    const amount = orderState[chatId].amount;
    const as = await bot.sendMessage(chatId, "⏳ Buyurtma yuborilmoqda...");
    setTimeout(() => {
      bot.deleteMessage(chatId, as.message_id).catch(()=> {})
    }, 2000)
    try {
      const response = await axios.post("https://seensms.uz/api/v1", null, {
        params: {
          key: apiKey,
          action: "add",
          service: 106,  
          link,
          quantity: amount
        }
      });

      if (response.data.order) {
        await bot.sendMessage(chatId, `✅ Buyurtma yuborildi!\n🆔 ID: <code>${response.data.order}</code>\n📦 Premium reaksiya: ${amount} ta\n🔗 Havola: ${link}`, { parse_mode: "HTML" });
      } else {
        await bot.sendMessage(chatId, `❌ Xatolik: ${JSON.stringify(response.data)}`);
      }
    } catch (err) {
      console.error(err);
      await bot.sendMessage(chatId, "❌ Xatolik yuz berdi");
    }
    delete orderState[chatId];
  }
  if (text === "🛍 Buyurtma berish") {
    await bot.sendMessage(chatId, "Buyurtma turini tanlang 👇", {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "👁 Ko'rishlar", callback_data: "order_view" },
          ],
          [
            { text: "🔥 Oddiy Reaksiya", callback_data: "order_reaction" }
          ],
          [
            { text: "🐳 Premium Reaksiya", callback_data: "order_premium_reaction" }
          ]
        ]
      }
    });
  }
});

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  const messageId = query.message.message_id;
  if (data === "order_view") {
    await bot.editMessageText(`👁 Ko'rishlar buyurtmasi uchun son kiriting:\n\nminimal : 50\nmaksimal : 250`, {
      chat_id: chatId,
      message_id: query.message.message_id
    });
    orderState[chatId] = { type: "order_view" };
  }

  if (data === "order_reaction") {
    await bot.editMessageText(`🔥 Oddiy reaksiya buyurtmasi uchun son kiriting:\n\nminimal : 10\nmaksimal : 15`, {
      chat_id: chatId,
      message_id: query.message.message_id
    });
    orderState[chatId] = { type: "order_reaction" };
  }
  if (data === "order_premium_reaction") {
    await bot.editMessageText(`🐳 Premium reaksiya buyurtmasi uchun son kiriting:\n\nminimal : 10\nmaksimal : 15`, {
      chat_id: chatId,
      message_id: query.message.message_id
    });
    orderState[chatId] = { type: "order_premium_reaction" };
  }
    if (data === 'click_pay') {
    payState[query.from.id] = { step: 'amount' };
    return bot.sendMessage(query.from.id, `Karta raqam : 9860120154520189\n💰 Iltimos, kiritmoqchi bo'lgan summangizni kiriting (min: 5000, max: 50000):`);
  }

  if (data.startsWith('pay_accept_') || data.startsWith('pay_cancel_')) {
    const parts = data.split('_');
    const action = parts[1]; 
    const userId = parseInt(parts[2]);
    const amount = parseInt(parts[3]);

    if (action === 'accept') {
      const user = await User.findOne({ userId });
      if (user) {
        user.balance += amount;
        await user.save();
        await bot.sendMessage(userId, `✅ Sizning hisobingizga ${amount} so'm qo'shildi!`);
        await bot.editMessageCaption(`💰 To'lov miqdori: ${amount} so'm\nFoydalanuvchi: ${user.name} (ID: ${user.userId})\n✅ Tasdiqlandi`, {
          chat_id: chatId,
          message_id: messageId
        });
      }
    } else if (action === 'cancel') {
      await bot.sendMessage(userId, `❌ To'lov bekor qilindi.`);
      await bot.editMessageCaption(`💰 To'lov miqdori: ${amount} so'm\nFoydalanuvchi ID: ${userId}\n❌ Bekor qilindi`, {
        chat_id: chatId,
        message_id: messageId
      });
    }

    await bot.answerCallbackQuery(query.id);
  }
});

bot.onText(/\/admin/, async (msg) => {
  const chatId = msg.from.id;

  if (chatId.toString() !== adminId) return; 

  const users = await User.find();
  const totalUsers = users.length;
  const totalBalance = users.reduce((acc, user) => acc + user.balance, 0);

  await bot.sendMessage(chatId, `
⚡️ Admin Panel
━━━━━━━━━━━━━━
👤 Foydalanuvchilar soni: ${totalUsers}
💰 Umumiy balans: ${totalBalance.toFixed(2)} so'm
━━━━━━━━━━━━━━
`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "📢 E’lon yuborish", callback_data: "admin_announcement" }]
      ]
    }
  });
});

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  const messageId = query.message.message_id;

  if (data === 'admin_announcement' && chatId.toString() === adminId) {
    adminState[chatId] = { step: 'type' };
    await bot.sendMessage(chatId, "📢 E’lon turini tanlang:", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "📝 Matn", callback_data: "announcement_text" }],
          [{ text: "🖼 Rasm", callback_data: "announcement_photo" }],
          [{ text: "🎥 Video", callback_data: "announcement_video" }],
          [{ text: "🔗 Havola", callback_data: "announcement_link" }],
          [{ text: "🎵 Musiqa", callback_data: "announcement_audio" }]
        ]
      }
    });
    await bot.answerCallbackQuery(query.id);
  }

  if (chatId.toString() === adminId && adminState[chatId]?.step === 'type') {
    const typeMap = {
      announcement_text: 'text',
      announcement_photo: 'photo',
      announcement_video: 'video',
      announcement_link: 'link',
      announcement_audio: 'audio'
    };

    if (typeMap[data]) {
      adminState[chatId] = { step: 'content', type: typeMap[data] };
      await bot.sendMessage(chatId, `📢 Iltimos, e’lonni yuboring (${typeMap[data]}):`);
      await bot.answerCallbackQuery(query.id);
    }
  }
});

bot.on('message', async (msg) => {
  const chatId = msg.from.id;

  if (chatId.toString() !== adminId) return;

  const state = adminState[chatId];
  if (!state) return;

  const users = await User.find();

  if (state.step === 'content') {
    if (state.type === 'text') {
      for (let user of users) {
        await bot.sendMessage(user.userId, msg.text);
      }
      await bot.sendMessage(chatId, `✅ Matnli e’lon barcha foydalanuvchilarga yuborildi!`);
    }

    if (state.type === 'photo' && msg.photo) {
      const fileId = msg.photo[msg.photo.length - 1].file_id;
      for (let user of users) {
        await bot.sendPhoto(user.userId, fileId, { caption: msg.caption || "" });
      }
      await bot.sendMessage(chatId, `✅ Rasmli e’lon barcha foydalanuvchilarga yuborildi!`);
    }

    if (state.type === 'video' && msg.video) {
      const fileId = msg.video.file_id;
      for (let user of users) {
        await bot.sendVideo(user.userId, fileId, { caption: msg.caption || "" });
      }
      await bot.sendMessage(chatId, `✅ Video e’lon barcha foydalanuvchilarga yuborildi!`);
    }

    if (state.type === 'audio' && msg.audio) {
      const fileId = msg.audio.file_id;
      for (let user of users) {
        await bot.sendAudio(user.userId, fileId, { caption: msg.caption || "" });
      }
      await bot.sendMessage(chatId, `✅ Audio e’lon barcha foydalanuvchilarga yuborildi!`);
    }

    if (state.type === 'link') {
      const link = msg.text;
      for (let user of users) {
        await bot.sendMessage(user.userId, `🔗 E’lon: ${link}`);
      }
      await bot.sendMessage(chatId, `✅ Havolali e’lon barcha foydalanuvchilarga yuborildi!`);
    }

    delete adminState[chatId];
  }
});
