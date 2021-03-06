const express = require("express");
const router = express.Router();
const userModel = require("../../models/User");
const watchedMovies = require("../../models/WatchedMovies");
const bcrypt = require("bcryptjs");
var crypto = require("crypto");
const middleware = require("../../middleware/midlleware");
const config = require("config");
const { check, validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const { promisify } = require("util");
const unlinkAsync = promisify(fs.unlink);
const path = require("path");
const multer = require("multer");
const Jimp = require("jimp");
const _ = require("lodash");
const passport = require("passport");
const utils = require("../../utils");

const { forwardAuthenticated } = require("../../Auth/auth");

// router.post('/login', forwardAuthenticated, (req, res) => res.render('login'));
// router.get("/register", forwardAuthenticated, (req, res) =>
//   res.render("register")
// );

// Configure storage for multer
const storage = multer.diskStorage({
  destination: function(req, file, callback) {
    const dir = config.get("profileImages");
    fs.exists(dir, exists => {
      if (!exists) {
        return fs.mkdir(dir, error => callback(error, dir));
      }
      return callback(null, dir);
    });
  },
  filename: function(req, file, callback) {
    return callback(
      null,
      "IMAGE-" + Date.now() + path.extname(file.originalname)
    );
  }
});

// Set file size limit, and allowed extensions
const upload = multer({
  storage: storage,
  limits: { fileSize: 2000000 },
  fileFilter: (req, file, callback) => {
    // allowed extensions
    const fileTypes = /jpeg|jpg|png/;
    const extname = fileTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimeType = fileTypes.test(file.mimetype);
    return extname && mimeType
      ? callback(null, true)
      : callback("Invalid Profile Image");
  }
}).single("profileImage");

router.post("/login", (req, res) => {
  const { username, password } = req.body;
  console.log(username, password);
  userModel.findOne({ username: username }, function(err, user) {
    if (err) {
      return res.status(500).send("Server error");
    }
    if (!user) {
      return res.status(400).json({
        erros: [
          {
            msg: "User Not Exise"
          }
        ]
      });
    }
    if (!userModel.verifyPassword(password)) {
      return res.status(400).json({
        erros: [
          {
            msg: "Passowrd Error"
          }
        ]
      });
    }
    passport.authenticate("local", {
      successRedirect: "/",
      failureRedirect: "/login",
      failureFlash: true
    }),
      (req, res) => {
        console.log("logged in", req.user);
        var userInfo = {
          username: req.user.username
        };
        res.send(userInfo);
      };
  });
});

// @route   Post api/users
// @desc    Register user
// @access  Public
router.post(
  "/register",
  [
    check("profileImage", "profileImage is requird").isEmpty(),
    check("username", "Name is requird")
      .not()
      .isEmpty(),
    check("first_name", "Please entre a valide a valide first-name").isLength({
      min: 3,
      max: 10
    }),
    check("last_name", "Please entre a valide last_name").isLength({
      min: 3,
      max: 10
    }),
    check("email", "Please include a valide Email").isEmail(),
    check(
      "password",
      "Please entre a password with 6 or more characters"
    ).isLength({
      min: 6
    }),
    check("confirmPassword", "Passwords do not match").custom(
      (value, { req }) => value === req.body.password
    )
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array()
      });
    }
    const {
      profileImage,
      username,
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      verificationKey
    } = req.body;
    try {
      let user = await userModel.findOne({
        email
      });
      if (user) {
        return res.status(400).json({
          erros: [
            {
              msg: "User already Exists"
            }
          ]
        });
      }
      user = new userModel({
        profileImage,
        username,
        firstName,
        lastName,
        email,
        password,
        verificationKey
      });
      // Encrypte password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
      user.verificationKey = await crypto.randomBytes(16).toString("hex");
      await user
        .save()
        .then(user => {
          utils.sendConfirmationEmail(
            email,
            user.userName,
            user.verificationKey
          );
          res.status(200).json({
            message: "user inserted successfully, verification email is sent"
          });
        })
        .catch(err => res.status(500).json({ message: ">>>" + err.message }));
    } catch (err) {
      console.log(err);
      res.status(500).send("Server error");
    }
  }
);

//login Handle
router.post("/login", (req, res, next) => {
  passport.authenticate("local", {
    successRedirect: "",
    failureRedirect: "/login",
    failureFlash: true
  })(req, res, next);
});

// @route   GET api/users/me
// @desc    Test route
// @access  Private
router.get("/me", [middleware.auth], async (req, res) => {
  try {
  } catch (error) {
    res.status(500).send("Server Error");
  }
});

// @route   POST api/users/update
// @desc    Upload profile image
// @access  Private
router.post(
  "/update",
  [
    check("first_name", "Invalid First Name").isAlpha(),
    check("last_name", "Invalid Last Name").isAlpha(),
    check("username", "Invalid Username").isAlphanumeric(),
    check("email", "Invalid Email").isEmail(),
    check("oldPassword", "Enter Old password")
      .not()
      .isEmpty(),
    check("newPassword", "Enter valid password").custom(value => {
      const regex = /(?=.*[a-zA-Z])(?=.*[0-9]).{8,30}/i;
      return regex.test(value);
    }),
    check("confirmPassword", "Password not match").custom(
      (value, { req }) => value === req.body.newPassword
    )
  ],
  async (req, res) => {
    //Check errors
    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
      const errors = _(validationErrors.array())
        .groupBy("param")
        .mapValues(group => _.map(group, "msg")[0])
        .value();
      return res.status(400).json({
        msg: "Please fill the form with correct informations",
        errors
      });
    }

    const id = req.id;
    const {
      first_name,
      last_name,
      username,
      email,
      oldPassword,
      newPassword
    } = req.body;
    try {
      // const user = userModel.find({ id });
      // const matched = await bcrypt.compare(oldPassword, user.password);
      // if (matched) {
      //   user.first_name = first_name;
      //   user.last_name = last_name;
      //   user.username = username;
      //   user.email = email;
      //   user.password = newPassword;
      //   return res.json({ msg: "Updated Successfuly" });
      // }
      // return res.status(400).json({ msg: "Invalid Old Password" });
      return res.json({ msg: "passed validation" });
    } catch (error) {
      res.status(500).send("Server Error");
    }
  }
);

// @route   POST api/users/image
// @desc    Upload profile image
// @access  Private
router.post("/image", async (req, res) => {
  try {
    upload(req, res, async function(err) {
      if (err) {
        return res.status(400).json({ msg: err });
      }

      new Jimp(req.file.path, async function(err, image) {
        if (!err) {
          // Everything went fine.
          const user = await userModel.findOneAndUpdate(
            { id: req.id },
            { profileImage: req.file.filename }
          );
          if (user) return res.json(req.file.filename);
          return res.status(404).json({ msg: "User not Found" });
        }
        await unlinkAsync(req.file.path);
        return res.status(400).send({ msg: "Invalid Profile Image" });
      });
    });
  } catch (error) {
    res.status(500).send("Server Error");
  }
});

// @route   Post api/users/watched
// @desc    Record watched movie
// @access  Private
router.post("/watched", async (req, res) => {
  try {
    const { imdb_code, title, year, rating, poster, id } = req.body;
    const watched = new watchedMovies({
      user: id,
      imdb_code,
      title,
      year,
      rating,
      poster
    });
    await watched.save();
  } catch (error) {
    return res.status(500).json({ msg: "Server error" });
  }
});

// @route   Get api/users/watched
// @desc    Get user watched movies
// @access  Private
router.get("/watched", async (req, res) => {
  try {
    const { id } = req.body;
    const watched = await watchedMovies
      .find({ user: id })
      .sort({ date: -1 })
      .limit(8);
    return res.json(watched);
  } catch (error) {
    return res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
