import { createSlice } from "@reduxjs/toolkit";
import { fetchUserAction } from "../../action";

const initialState = {
    username: "",
    email: "",
    name: "",
    bio: "",
    profilePic: "",
    walletAddress: "",
    subscriberCount: -2,
    subscription: [],
    followers: [],
    following: []
}

const UserSlice = createSlice({
    name: "userslice",
    initialState,
    reducers: {
        setUser: (state, action) => {
            state.username = action.payload.username;
            state.email = action.payload.email;
            state.name = action.payload.name || "";
            state.bio = action.payload.bio || "";
            state.profilePic = action.payload.profilePic || "";
            state.walletAddress = action.payload.walletAddress;
            state.subscriberCount = action.payload.subscriberCount;
            state.subscription = action.payload.subscription || [];
            state.followers = action.payload.followers || [];
            state.following = action.payload.following || [];
        },
        resetUser: (state, action) => {
            state.username = "";
            state.email = "";
            state.name = "";
            state.bio = "";
            state.profilePic = "";
            state.walletAddress = "";
            state.subscriberCount = -2;
            state.subscription = [];
            state.followers = [];
            state.following = [];
        },
        updateUser: (state, action) => {
           Object.assign(state, action.payload); //mutable approach 
        }
    },
})

export const {setUser, resetUser,updateUser} = UserSlice.actions;
export default UserSlice.reducer;