import mongoose from "mongoose";

const blogSchema = new mongoose.Schema({
  title: String,
  description: String,
  content: String,
  image:{
    imagePath:{type:String,default:''},
    image_id: {type:String,default:''}
  },
  author: { 
    type: String, 
    index: true 
  },
  date: Date,
  tags: { 
    type: [String], 
    index: true  
  },
  isPremium: { 
    type: Boolean, 
    index: true 
  },
  views: {
    type: Number,
    default: 0,
    index: true
  },
  viewsLog: {
    type: [{
      date: { type: Date, default: Date.now }
    }],
    default: []
  },
  likes: {
    type: [String],
    default: [],
    index: true
  },
  comments: {
    type: [{
      username: { type: String, required: true },
      content: { type: String, required: true },
      createdAt: { type: Date, default: Date.now }
    }],
    default: []
  },
})

// Add text index for approximate searching
blogSchema.index({ 
  title: 'text', 
  description: 'text', 
  content: 'text', 
  tags: 'text',
  author: 'text'
});

const userSchema = new mongoose.Schema({
    username: {
    type: String,
    unique: true  // This creates a unique index on username
    },
    email:{
    type: String,
    unique: true  // This creates a unique index on username
    },
  password: String,
  blogs: [mongoose.Schema.Types.ObjectId],
  walletAddress: String,
  subscriberCount: Number,
  subscription: [String],
  subscriptionPrice: {
      type: Number,
      default: 0  // Default price for existing users
  },
  bookmarks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Blog4'
  }],
  profilePic: {
    type: String,
    default: ""
  },
  name: {
    type: String,
    default: ""
  },
  bio: {
    type: String,
    default: ""
  },
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User4'
  }],
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User4'
  }],
  earnings: [{
  // Store just the date without time portion (midnight of that day)
  date: { 
    type: Date, 
    default: () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return today;
    }
  },
  amount: { type: Number, default: 0 }
}]
})

userSchema.index({
  username: 'text',
  name: 'text',
  bio: 'text'
});

const HistorySchema = new mongoose.Schema({
  username: {
      type: String,
      unique: true
    },
    visitHistory: {
        type: [{
            blogId: { type: mongoose.Schema.Types.ObjectId, ref: 'Blog4' },
            visitedAt: { type: Date, default: Date.now }
        }],
        default: [],
        // Limit array size to 20 elements
        validate: [array => array.length <= 20, 'Visit history exceeds maximum size of 20']
    }
  });


// Example schema for pending transactions
const PendingTransactionSchema = new mongoose.Schema({
  transactionHash: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  creatorUsername: { type: String, required: true },
  recipientAddress: { type: String, required: true },
  amount: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now, expires: '24h' }, // TTL index
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' }
});

// Direct Messages Conversation Schema
const conversationSchema = new mongoose.Schema({
  participants: [{
    type: String,
    required: true,
    index: true
  }],
  lastMessage: {
    content: { type: String, default: '' },
    sender: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
  },
  updatedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Direct Messages Individual Message Schema
const messageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation4',
    required: true,
    index: true
  },
  sender: {
    type: String,
    required: true,
    index: true
  },
  recipient: {
    type: String,
    required: true,
    index: true
  },
  content: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  }
});

const Blog = mongoose.models.Blog4 || mongoose.model("Blog4", blogSchema);
const User = mongoose.models.User4 || mongoose.model("User4", userSchema);
const PendingTransaction = mongoose.models.PendingTransaction4 || mongoose.model("PendingTransaction4", PendingTransactionSchema);
const History = mongoose.models.History4 || mongoose.model("History4", HistorySchema);
const Conversation = mongoose.models.Conversation4 || mongoose.model("Conversation4", conversationSchema);
const Message = mongoose.models.Message4 || mongoose.model("Message4", messageSchema);

export { Blog, User, PendingTransaction, History, Conversation, Message };