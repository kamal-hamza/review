import { Schema, model } from "mongoose";
import { IReview, reviewSchema } from "./review.model";

export interface IUser {
    profile_pic_url: string | null;
    username: string;
    email: string;
    password: string;
    role: Array<string>;
    reviews: Array<IReview>;
    liked_products: Array<number>;
}

const userSchema = new Schema<IUser>({
    profile_pic_url: {
        type: String,
        default: "",
        required: false,
    },
    username: {
        type: String,
        default: "",
        required: true,
    },
    email: {
        type: String,
        default: "",
        required: true,
        unique: true,
    },
    password: {
        type: String,
        default: "",
        required: true,
    },
    role: {
        type: [String],
        default: ["guest"],
        required: true,
    },
    reviews: {
        type: [reviewSchema],
        default: [],
        required: false,
    },
    liked_products: {
        type: [Number],
        default: [],
        required: false,
    },
});

const userModel = model<IUser>("User", userSchema);

export default userModel;
