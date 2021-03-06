const express = require("express");
const router = express.Router();
const userModel = require("../../models/User");
const bcrypt = require("bcryptjs");
const config = require("config");
const jwt = require("jsonwebtoken");
const { check, validationResult } = require("express-validator");

// @route   Post api/auth
// @desc    Authenicate user & get token
// @access  Public
router.post(
  "/",
  [
    check("email", "Please include a valide Email").isEmail(),
    check("password", "Password is Requird").exists()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array()
      });
    }
    const { email, password } = req.body;
    try {
      let user = await userModel.findOne({
        email
      });
      if (!user) {
        return res.status(400).json({
          erros: [
            {
              msg: "Invalide Credentials"
            }
          ]
        });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({
          erros: [
            {
              msg: "Invalide Credentials"
            }
          ]
        });
      }
      const payload = {
        user: {
          id: user.id
        }
      };
      jwt.sign(
        payload,
        config.get("jwtSecret"),
        {
          expiresIn: 360000
        },
        (err, token) => {
          if (err) throw err;
          res.json({
            token
          });
        }
      );
    } catch (err) {
      res.status(500).send("Server error");
    }
  }
);

module.exports = router;
