import mongoose, { Document } from 'mongoose';

enum TokenTypes {
    VERIFY = 'VERIFY ACCOUNT',
    RESET_PASSWORD = 'RESET PASSWORD',
}

export interface Token extends Document {
    _id: mongoose.Schema.Types.ObjectId;
    type: TokenTypes;
    token: string;
    createdAt: string;
    expiresAt: string;
}

const TokenSchema = new mongoose.Schema({
    type: { type: String, enum: Object.values(TokenTypes), required: true },
    token: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: Date.now, expires: 900 },
});

// OR
TokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 900 });

// OR with conditional index
TokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 900, partialFilterExpression: { type: 'RESET PASSWORD' } });

const TOKEN = mongoose.model<Token>('Token', TokenSchema);

export default TOKEN;
