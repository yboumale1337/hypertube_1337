import axios from "axios";
import { ADD_NEW_COMMENT } from "./actionTypes";

var _ = require("lodash");

// @desc get all the movie info
export const movieInfo = async imdb_code => {
  try {
    const res = await axios.get(`/api/library/movies/imdb_code/${imdb_code}`);
    return res.data[0];
  } catch (err) {
    const errors = err.response.data.msg;
    return errors;
  }
};
// @desc get other movies by genre
export const otherMovies = async genre => {
  try {
    const res = await axios.get(`/api/library/movies/genre/${genre}`);
    return _.sampleSize(res.data, 8);
  } catch (err) {
    const errors = err.response.data.msg;
    return errors;
  }
};

// @desc update the selected movie date of watched
export const watchedUpdate = async (hash_code, imdb_code) => {
  const config = {
    headers: {
      "Content-Type": "application/json"
    }
  };
  const body = JSON.stringify({ hash_code, imdb_code });
  try {
    const res = await axios.post("/api/streaming/watchedUpdate", body, config);
  } catch (error) {
    console.log(error);
  }
};

// @desc add new comment on the chossen movie
export const addComment = (imdb_code, comment_text) => async disptach => {
  const config = {
    headers: {
      "Content-Type": "application/json"
    }
  };
  const body = JSON.stringify({ imdb_code, comment_text });
  console.log(imdb_code, comment_text);
  try {
    const res = await axios.post("/api/streaming/AddComment", body, config);
    console.log(res);
    disptach({
      type: ADD_NEW_COMMENT,
      payload: res.data
    });
  } catch (error) {
    console.log(error);
  }
};

// @desc get all comments on the chossen movie
export const getComments = async imdb_code => {
  try {
    const res = await axios.get(`/api/streaming/getComments/${imdb_code}`);
    return res.data;
    console.log("getComments ", res);
  } catch (error) {
    console.log(error);
  }
};
