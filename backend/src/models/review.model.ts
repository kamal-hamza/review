import { Schema } from "mongoose";

export interface IReview {
    review: string;
}

export const reviewSchema = new Schema<IReview>({
    review: { type: String, required: true },
});
