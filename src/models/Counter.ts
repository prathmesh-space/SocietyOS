import mongoose from 'mongoose';

const CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

if (process.env.NODE_ENV !== 'production') {
  delete mongoose.models.Counter;
}

const Counter = mongoose.models.Counter || mongoose.model('Counter', CounterSchema);

export default Counter;
