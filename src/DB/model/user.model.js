import mongoose from "mongoose";
import { GenderEnum, ProviderEnum, RoleEnum } from "../../common/enum/index.js";

export const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, minLength: 2, maxLength: 25 },
    lastName: { type: String, required: true, minLength: 2, maxLength: 25 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    //google accounts have no password
    password: {
      type: String,
      required: function () {
        return this.provider === ProviderEnum.SYSTEM;
      },
    },

    //stored encrypted
    phone: String,
    age: { type: Number, min: 18, max: 60 },
    image: String,

    gender: {
      type: String,
      enum: Object.values(GenderEnum),
      default: GenderEnum.MALE,
    },
    role: {
      type: Number,
      enum: Object.values(RoleEnum),
      default: RoleEnum.USER,
    },
    provider: {
      type: Number,
      enum: Object.values(ProviderEnum),
      default: ProviderEnum.SYSTEM,
    },

    twoStepEnabled: { type: Boolean, default: false },

    //tokens issued before this date are rejected
    changeCredentialsTime: Date,
  },
  {
    strict: true,
    strictQuery: true,
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  },
);

userSchema
  .virtual("username")
  .set(function (value) {
    const [firstName, lastName] = value?.split(" ") || [];
    this.set({ firstName, lastName });
  })
  .get(function () {
    return `${this.firstName} ${this.lastName}`;
  });

export const UserModel =
  mongoose.models.User || mongoose.model("User", userSchema);
