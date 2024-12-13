require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const TelegramBot = require('node-telegram-bot-api');
const { Spot } = require('../dist/modules/spot'); // Adjust the path as needed for MEXC SDK

const app = express();
const port = process.env.PORT || 4000;
const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
const webhookUrl = process.env.WEBHOOK_URL; // Your ngrok or production URL
const mexcApiKey = process.env.MEXC_API_KEY;
const mexcApiSecret = process.env.MEXC_API_SECRET;

// Middleware for parsing JSON
app.use(bodyParser.json());

// Initialize Telegram bot and MEXC client
const bot = new TelegramBot(telegramToken, { webHook: true });
const client = new Spot(mexcApiKey, mexcApiSecret);

// Set Telegram webhook
bot.setWebHook(`${webhookUrl}/bot${telegramToken}`)
  .then(() => console.log(`Webhook set to ${webhookUrl}/bot${telegramToken}`))
  .catch(err => console.error('Error setting webhook:', err));

// Root route for browser testing
app.get('/', (req, res) => {
  res.send('MEXC Telegram Bot is running');
});

// Webhook route for Telegram updates
app.post(`/bot${telegramToken}`, (req, res) => {
  console.log('Webhook request received:', req.body); // Debug log
  bot.processUpdate(req.body); // Process Telegram update
  res.sendStatus(200); // Respond to Telegram
});

// Catch-all for unhandled routes
app.use((req, res) => {
  console.log(`Unhandled route: ${req.path}`);
  res.status(404).send('Not Found');
});

// Start the Express server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Telegram bot commands
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "Welcome to the MEXC Trading Bot! Use /help for commands.");
});

bot.onText(/\/help/, (msg) => {
  const helpMessage = `
Available Commands:
/balance - Check your account balance
/orderbook <symbol> - View order book for a trading pair
/buy <symbol> <quantity> <price> - Place a limit buy order
/sell <symbol> <quantity> <price> - Place a limit sell order
/autotrade <symbol> <buyPrice> <sellPrice> <amount> - Start auto-trading
/stopautotrade - Stop auto-trading
`;
  bot.sendMessage(msg.chat.id, helpMessage);
});

// Fetch account balances
bot.onText(/\/balance/, async (msg) => {
  try {
    const accountInfo = await client.accountInfo();
    const balances = accountInfo.balances.filter(b => parseFloat(b.free) > 0);
    if (balances.length === 0) {
      bot.sendMessage(msg.chat.id, "Your account has no available balances.");
      return;
    }
    let response = "Your Balances:\n";
    balances.forEach(b => {
      response += `${b.asset}: ${b.free}\n`;
    });
    bot.sendMessage(msg.chat.id, response);
  } catch (error) {
    bot.sendMessage(msg.chat.id, `Error fetching balance: ${error.response?.data || error.message}`);
  }
});

// Fetch order book
bot.onText(/\/orderbook (.+)/, async (msg, match) => {
  const symbol = match[1].toUpperCase();
  try {
    const orderBook = await client.depth(symbol);
    let bookMessage = `Order Book for ${symbol}:\n\nBids:\n`;
    orderBook.bids.slice(0, 5).forEach(([price, qty]) => {
      bookMessage += `${price} x ${qty}\n`;
    });
    bookMessage += "\nAsks:\n";
    orderBook.asks.slice(0, 5).forEach(([price, qty]) => {
      bookMessage += `${price} x ${qty}\n`;
    });
    bot.sendMessage(msg.chat.id, bookMessage);
  } catch (error) {
    bot.sendMessage(msg.chat.id, `Error fetching order book: ${error.response?.data || error.message}`);
  }
});

// Place limit buy order
bot.onText(/\/buy (.+) (.+) (.+)/, async (msg, match) => {
  const symbol = match[1].toUpperCase();
  const quantity = parseFloat(match[2]);
  const price = parseFloat(match[3]);
  try {
    const order = await client.newOrder(symbol, 'BUY', 'LIMIT', {
      quantity,
      price,
      timeInForce: 'GTC',
    });
    bot.sendMessage(msg.chat.id, `Buy order placed successfully:\nOrder ID: ${order.orderId}\nSymbol: ${symbol}\nQuantity: ${quantity}\nPrice: ${price}`);
  } catch (error) {
    bot.sendMessage(msg.chat.id, `Error placing buy order: ${error.response?.data || error.message}`);
  }
});

// Place limit sell order
bot.onText(/\/sell (.+) (.+) (.+)/, async (msg, match) => {
  const symbol = match[1].toUpperCase();
  const quantity = parseFloat(match[2]);
  const price = parseFloat(match[3]);
  try {
    const order = await client.newOrder(symbol, 'SELL', 'LIMIT', {
      quantity,
      price,
      timeInForce: 'GTC',
    });
    bot.sendMessage(msg.chat.id, `Sell order placed successfully:\nOrder ID: ${order.orderId}\nSymbol: ${symbol}\nQuantity: ${quantity}\nPrice: ${price}`);
  } catch (error) {
    bot.sendMessage(msg.chat.id, `Error placing sell order: ${error.response?.data || error.message}`);
  }
});

// Auto-trade functionality
let autoTradeActive = false;

bot.onText(/\/autotrade (.+) (.+) (.+) (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const symbol = match[1].toUpperCase();
  const buyPrice = parseFloat(match[2]);
  const sellPrice = parseFloat(match[3]);
  const amount = parseFloat(match[4]);

  bot.sendMessage(chatId, `Starting auto-trade for ${symbol}.`);
  autoTradeActive = true;

  while (autoTradeActive) {
    try {
      const accountInfo = await client.accountInfo();
      const usdtBalance = accountInfo.balances.find(b => b.asset === 'USDT');

      if (!usdtBalance || parseFloat(usdtBalance.free) < amount) {
        bot.sendMessage(chatId, `Insufficient USDT balance to auto-trade.`);
        autoTradeActive = false;
        return;
      }

      const quantity = (amount / buyPrice).toFixed(6);

      const buyOrder = await client.newOrder(symbol, 'BUY', 'LIMIT', {
        quantity,
        price: buyPrice,
        timeInForce: 'GTC',
      });
      bot.sendMessage(chatId, `Buy order placed. Waiting for fill.`);

      let buyOrderFilled = false;
      while (!buyOrderFilled && autoTradeActive) {
        const orderStatus = await client.queryOrder(symbol, { orderId: buyOrder.orderId });
        if (orderStatus.status === 'FILLED') {
          buyOrderFilled = true;
          bot.sendMessage(chatId, `Buy order filled. Placing sell order.`);
        }
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      const sellOrder = await client.newOrder(symbol, 'SELL', 'LIMIT', {
        quantity,
        price: sellPrice,
        timeInForce: 'GTC',
      });
      bot.sendMessage(chatId, `Sell order placed. Waiting for fill.`);

      let sellOrderFilled = false;
      while (!sellOrderFilled && autoTradeActive) {
        const orderStatus = await client.queryOrder(symbol, { orderId: sellOrder.orderId });
        if (orderStatus.status === 'FILLED') {
          sellOrderFilled = true;
          bot.sendMessage(chatId, `Sell order filled. Auto-trade cycle complete.`);
        }
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } catch (error) {
      bot.sendMessage(chatId, `Error in auto-trade: ${error.response?.data || error.message}`);
      autoTradeActive = false;
    }
  }
});

bot.onText(/\/stopautotrade/, (msg) => {
  autoTradeActive = false;
  bot.sendMessage(msg.chat.id, "Auto-trade stopped.");
});
