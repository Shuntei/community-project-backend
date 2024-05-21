import express from "express";
import db from "./../../utils/mysql2-connect.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import upload from "./../../utils/linda/upload-imgs.js";
import nodemailer from "nodemailer";

const router = express.Router();
const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.APP_PASSWORD,
  },
});

async function saveOTPInDB(id, otp, otpExpiry) {
  const sql = `UPDATE mb_user SET otp=?, otp_expiry=? WHERE id=?`;
  const [result] = await db.query(sql, [otp, otpExpiry, id]);
}

async function saveReqInDB(id, reqExpiry, token) {
  const sql = `INSERT INTO mb_password_reset_tokens (user_id, expiry_time, token) VALUES (?, ?, ?) `;
  const [result] = await db.query(sql, [id, reqExpiry, token]);
}

const sendMail = async (transporter, id, email, username) => {
  const otp = Math.floor(10000 + Math.random() * 90000);
  const otpExpiry = new Date();
  otpExpiry.setMinutes(otpExpiry.getMinutes() + 5);

  await saveOTPInDB(id, otp, otpExpiry);

  const mailOptions = {
    from: {
      name: "Ruins",
      address: process.env.EMAIL_USER,
    },
    to: email,
    subject: "Your OTP for Verification",
    html: `
    <div style="font-family: 'Open Sans', sans-serif; font-size: 14px; color: #5F6166; width: 100%; height: 100%; margin: 0 auto; padding-block: 32px;">
    <table cellpadding="0" cellspacing="0" border="0" align="center" style="background: #F7F8F8; width: 90%; max-width: 600px; margin: 0 auto;">
        <tr>
            <td align="center" style="padding: 20px;">
                <table cellpadding="0" cellspacing="0" border="0" align="center" style="background: white; padding: 20px; width: 100%;">
                    <tr>
                        <td>
                            <p style="font-size: 16px; margin-bottom: 10px;">Hello <span style="color: #061820; font-weight: bold;">${username}</span>!</p>
                        </td>
                    </tr>
                    <tr>
                        <td align="center">
                            <table cellpadding="0" cellspacing="0" border="0" align="center" style="background: #F2F5F4; height: 100px; width: 100%; text-align: center;">
                                <tr>
                                    <td>
                                        <h2 style="font-size: 18px; color: #061820; margin: 0;">Your OTP code is</h2>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <p style="font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 0;">${otp}</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <p style="font-size: 14px; margin: 10px 0;">The OTP code above is one-time-use and expires after <strong>5 minutes</strong> for security reasons. If you did not request this email, you can ignore and delete it.</p>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <p style="font-size: 16px; color: #061820; text-align: center; margin-bottom: 5px;">Thanks</p>
                            <p style="font-size: 16px; text-align: center; margin-top: 0;"><a style="text-decoration: none; color: #20938D;" href="http://localhost:3000">Ruins Team</a></p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</div>
`,
  };

  try {
    await transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log("Error sending email:", error);
      } else {
        console.log("Email sent:" + info.response);
      }
    });
    console.log("Sent successfully");
  } catch (error) {
    console.log(error);
  }
};

const sendPasswordResetEmail = async (transporter, email, id) => {
  const reqExpiry = new Date();
  reqExpiry.setMinutes(reqExpiry.getMinutes() + 10);

  const token = jwt.sign(
    { id: id, reqExpiry: reqExpiry },
    process.env.JWT_SECRET
  );

  await saveReqInDB(id, reqExpiry, token);

  const resetPasswordLink = `http://localhost:3000/member/account/reset-password?token=${token}`;

  const mailOptions = {
    from: {
      name: "Ruins",
      address: process.env.EMAIL_USER,
    },
    to: email,
    subject: "Restore your password",
    html: `
    <div style="font-family: 'Open Sans', sans-serif; font-size: 14px; color: #5F6166; width: 100%; height: 100%; padding-block: 32px;">
      <table cellpadding="0" cellspacing="0" border="0" align="center" style="padding: 40px; background: #F7F8F8; width: 90%; max-width: 600px; margin: 0 auto;">
      <tr>
          <td align="center">
              <p style="font-size: 16px; margin-bottom: 10px;">We received a password reset request!</p>
          </td>
      </tr>
      <tr>
          <td align="center">
              <table cellpadding="0" cellspacing="0" border="0" align="center" style="width: 100%; text-align: center;">
                  <tr>
                      <td colspan="2">
                          <p style="padding-bottom: 20px;">This link will expire in <strong> 10 minutes </strong>, so please use it right away.</p>
                      </td>
                  </tr>
                  <tr>
                      <td colspan="2" align="center">
                          <a href="${resetPasswordLink}" 
                            style="border: 2px solid black; 
                            font-size: 20px;
                            width: 150px; 
                            font-style: italic; 
                            background-color: white; 
                            color: black; 
                            padding: 13px 30px; 
                            text-align: center; 
                            text-decoration: none !important;">
                            Reset password
                          </a>
                      </td>
                  </tr>
              </table>
          </td>
      </tr>
      <tr>
          <td align="center">
              <p style="font-size: 14px; margin: 10px 0; margin-top: 30px">If you did not make this request, you can ignore this message and your password will not be changed. Someone probably typed your email by mistake.</p>
          </td>
      </tr>
      <tr>
          <td>
              <p style="font-size: 14px; color: #061820; text-align: center; margin-bottom: 5px;">Regards</p>
              <p style="font-size: 16px; text-align: center; margin-top: 0;"><a style="text-decoration: none; color: #20938D;" href="http://localhost:3000">Ruins Team</a></p>
          </td>
      </tr>
  </table>
</div>
`,
  };

  try {
    await transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log("Error sending email:", error);
      } else {
        console.log("Email sent:" + info.response);
      }
    });
    console.log("Sent successfully");
  } catch (error) {
    console.log(error);
  }
};

function generateOutputData(rows) {
  const token = jwt.sign(
    { id: rows[0].id, username: rows[0].username },
    process.env.JWT_SECRET
  );

  return {
    id: rows[0].id,
    username: rows[0].username,
    name: rows[0].name,
    email: rows[0].email,
    profileUrl: rows[0].profile_pic_url,
    coverUrl: rows[0].cover_pic_url,
    googlePhoto: rows[0].google_photo,
    aboutMe: rows[0].about_me,
    showContactInfo: rows[0].allow_contact_info_visibility,
    ytLink: rows[0].youtube_link,
    fbLink: rows[0].facebook_link,
    igLink: rows[0].instagram_link,
    gmailLink: rows[0].gmail_link,
    token,
  };
}

const insertUserPreference = async (id) => {
  try {
    const defaultPreferences = {
      live: true,
      product: true,
      trip: true,
      game: true,
      all: false,
    };

    const sqlInsert = `INSERT INTO mb_user_preference SET ?, user_id = ?`;
    await db.query(sqlInsert, [defaultPreferences, id]);

    console.log("User preferences inserted successfully");
  } catch (error) {
    console.log("Error inserting user preference:", error);
  }
};

const defaultData = {
  id: 0,
  username: "",
  name: "",
  email: "",
  profileUrl: "",
  coverUrl: "",
  googlePhoto: false,
  aboutMe: "",
  showContactInfo: false,
  ytLink: "",
  fbLink: "",
  igLink: "",
  gmailLink: "",
  token: "",
};

router.post("/signup", async (req, res) => {
  const output = {
    success: false,
    code: 0,
    error: "",
    data: defaultData,
  };

  const { email, password, phone, username, birthday } = req.body;

  const usernameSql = `SELECT username FROM mb_user WHERE username LIKE ?`;
  const [usernameRows] = await db.query(usernameSql, [`%${username}%`]);
  const emailSql = `SELECT email FROM mb_user WHERE email LIKE ?`;
  const [emailRows] = await db.query(emailSql, [`%${email}%`]);

  if (usernameRows.length) {
    output.success = false;
    output.code = 1;
    output.error = "Username exist";
  }

  if (emailRows.length) {
    output.success = false;
    output.code = 2;
    output.error = "Email exist";
  }

  if (usernameRows.length && emailRows.length) {
    output.success = false;
    output.code = 3;
    output.error = "Email and username both exist";
  }

  if (!usernameRows.length && !emailRows.length) {
    const hash = await bcrypt.hash(password, 10);

    const sql = `INSERT INTO mb_user
    (username, 
    email, 
    phone, 
    password, 
    birthday, 
    created_at) 
    VALUES (?, ?, ?, ?, ?, NOW())`;

    try {
      const [rows] = await db.query(sql, [
        username,
        email,
        phone,
        hash,
        birthday,
      ]);
      output.success = !!rows.affectedRows;
      await insertUserPreference(rows.insertId);
      const id = rows.insertId;

      if (output.success) {
        try {
          const userSql = `SELECT * FROM mb_user WHERE id=?`;
          const [userRows] = await db.query(userSql, id);
          output.data = generateOutputData(userRows);
        } catch (error) {
          console.log("Something happened with the sql", error);
        }
      }
    } catch (ex) {
      console.log(ex);
    }
  }

  res.json(output);
});

router.post("/login", async (req, res) => {
  const output = {
    success: false,
    code: 0,
    error: "",
    data: defaultData,
  };

  const { account, password } = req.body;

  const usernameSql = `SELECT * FROM mb_user WHERE username = ?`;
  const [usernameRows] = await db.query(usernameSql, account);
  const emailSql = `SELECT * FROM mb_user WHERE email = ?`;
  const [emailRows] = await db.query(emailSql, account);

  if (!usernameRows.length && !emailRows.length) {
    (output.success = false), (output.code = 1);
    output.error = "Account or password is wrong";
    return res.json(output);
  }

  const row = usernameRows.length ? usernameRows : emailRows;

  const result = await bcrypt.compare(password, row[0].password);
  if (result) {
    output.success = true;
    output.data = generateOutputData(row);
  } else {
    output.code = 2;
    output.error = "Account or password is wrong";
  }

  res.json(output);
});

router.post("/google-login", async (req, res) => {
  const output = {
    success: false,
    code: 0,
    error: "",
    message: "",
    body: req.body,
    data: null,
  };

  const { account, username, photoUrl, googleId } = req.body;

  try {
    const sql = `SELECT * FROM mb_user WHERE google_id = ?`;
    const [rows] = await db.query(sql, [googleId]);

    if (!rows.length) {
      const userSql = `INSERT INTO mb_user
      (username, 
      email, 
      google_photo,
      created_at, 
      google_id, 
      profile_pic_url) 
      VALUES (?, ?, ?, NOW(), ?, ?);`;

      try {
        const [userRows] = await db.query(userSql, [
          username,
          account,
          true,
          googleId,
          photoUrl,
        ]);
        output.success = !!userRows.affectedRows;

        if (output.success) {
          const sql = "SELECT * FROM mb_user WHERE google_id=?";
          const [rows] = await db.query(sql, googleId);

          if (rows.length) {
            output.data = generateOutputData(rows);
            output.success = true;
            output.message = "New info was inserted";
            await insertUserPreference(rows[0].id);
          }
        } else {
          output.success = false;
          output.code = 1;
          output.message = "While selecting from mb_user, something went wrong";
          return res.json(output);
        }
      } catch (ex) {
        console.log(ex);
      }
    } else {
      output.data = generateOutputData(rows);
      output.success = true;
      output.message = "Successfully logged in";
    }
  } catch (ex) {
    console.log("Something went wrong", ex);
  }

  res.json(output);
});

router.put(
  "/edit-profile/:id",
  upload.fields([
    { name: "cover", maxCount: 1 },
    { name: "avatar", maxCount: 1 },
  ]),
  async (req, res) => {
    const output = {
      success: false,
      code: 0,
      error: "",
      message: "",
      data: null,
    };
    const { name, username, aboutMe, allowShowContact, yt, fb, ig, email } =
      req.body;
    let allowContact = allowShowContact ? true : false;
    const { avatar, cover } = req.files;
    const hasAvatar = avatar && avatar[0].filename;
    const hasCover = cover && cover[0].filename;
    let id = req.params.id;

    try {
      const usernameSql = `SELECT * FROM mb_user WHERE username = ? and id != ? `;
      const [usernameRows] = await db.query(usernameSql, [`%${username}%`, id]);

      if (usernameRows.length) {
        output.success = false;
        output.code = 1;
        output.error = "Username is in use";
        return res.json(output);
      } else {
        try {
          const sql = `SELECT * FROM mb_user WHERE id = ? `;
          const [rows] = await db.query(sql, id);
          const userSql = `UPDATE mb_user 
          SET 
          name=?, 
          username=?,
          profile_pic_url=?,
          cover_pic_url=?,
          google_photo=?,
          about_me=?,
          allow_contact_info_visibility=?,
          youtube_link=?,
          facebook_link=?,
          instagram_link=?,
          gmail_link=? 
          WHERE id=?`;
          const [result] = await db.query(userSql, [
            name,
            username,
            hasAvatar ? avatar[0].filename : rows[0].profile_pic_url,
            hasCover ? cover[0].filename : rows[0].cover_pic_url,
            hasAvatar ? false : rows[0].google_login,
            aboutMe,
            allowContact,
            yt,
            fb,
            ig,
            email,
            id,
          ]);
          if (result.affectedRows) {
            const sql = `SELECT * FROM mb_user WHERE id = ?`;
            const [rows] = await db.query(sql, id);
            if (rows.length) {
              output.data = rows;
              output.success = true;
              output.message = "Updated successfully";
            }
          } else {
            output.success = false;
            output.code = 1;
            output.message = "Update unsuccessful";
          }
        } catch (ex) {
          console.log("Something happened while trying to update all info", ex);
          output.success = false;
          output.error = 2;
        }
      }

      return res.json(output);
    } catch (ex) {
      console.log(ex);
    }
  }
);

router.post("/check-email/:id", async (req, res) => {
  const output = {
    success: false,
    code: 0,
    message: "",
    emailCode: 0,
    emailError: "",
    passwordCode: 0,
    passwordError: "",
  };
  const id = req.params.id;

  const { password, email, newEmail, username } = req.body;

  let pass = password ? password : "";
  let isRightPass = false;

  const sql = `SELECT * FROM mb_user WHERE id=?`;
  const [rows] = await db.query(sql, id);

  if (rows.length) {
    if (rows[0].password) {
      const result = await bcrypt.compare(pass, rows[0].password);
      if (result) {
        isRightPass = true;
      } else {
        output.success = false;
        output.passwordCode = 1;
        output.passwordError = "Wrong password";
      }
    } else {
      isRightPass = true;
    }
  }

  let isUniqueEmail = false;
  const emailSql = `SELECT * FROM mb_user WHERE email LIKE ? AND id != ?`;
  const [emailRows] = await db.query(emailSql, [`%${newEmail}%`, id]);
  if (emailRows.length) {
    output.success = false;
    output.emailCode = 1;
    output.emailError = "Email in use";
  } else {
    isUniqueEmail = true;
  }

  if (isUniqueEmail && isRightPass) {
    output.success = true;
    await sendMail(transporter, id, email, username);
  }

  res.json(output);
});

async function verifyOTP(id, otp) {
  const sql = `SELECT * FROM mb_user WHERE id = ?`;
  const [rows] = await db.query(sql, id);

  if (!rows.length) {
    return { isValid: false };
  }

  const storedOTP = rows[0].otp;
  const otpExpiry = new Date(rows[0].otp_expiry);

  if (otp !== storedOTP) {
    return { isValid: false };
  }

  if (new Date() > otpExpiry) {
    return { isValid: false, isExpired: true };
  }

  return { isValid: true, isExpired: false };
}

router.post("/send-code/:id", async (req, res) => {
  const { username, email } = req.body;
  const id = req.params.id;
  try {
    await sendMail(transporter, id, email, username);
    res.json({ success: true, message: "otp sent" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "otp wasn't sent" });
  }
});

router.post("/edit-info/:id", async (req, res) => {
  const output = {
    success: false,
    message: "",
    code: 0,
  };
  const id = req.params.id;
  const { otp, newEmail, newPassword } = req.body;

  const { isValid, isExpired } = await verifyOTP(id, otp);

  if (!isValid) {
    if (isExpired) {
      output.message = "OTP has expired";
      output.code = 3;
    } else {
      output.message = "Invalid OTP";
      output.code = 4;
    }
    output.success = false;
    return res.json(output);
  }

  const sql = `UPDATE mb_user SET email = ? WHERE id=?`;
  if (newEmail) {
    try {
      await db.query(sql, [newEmail, id]);
      output.success = true;
      output.message = "Email updated successfully";
      output.code = 1;
      return res.json(output);
    } catch (error) {
      console.log("Error updating email:", error);
      (output.success = false), (output.message = "Error updating email");
    }
  }

  const passSql = `UPDATE mb_user SET password = ?, otp = NULL WHERE id = ?`;
  if (newPassword) {
    try {
      const hash = await bcrypt.hash(newPassword, 10);
      await db.query(passSql, [hash, id]);
      output.success = true;
      output.code = 2;
      output.message = "Password updated successfully";
      return res.json(output);
    } catch (error) {
      console.log("Error updating password:", error);
      (output.success = false), (output.message = "Error updating password");
    }
  }

  res.json(output);
});

router.post("/check-password/:id", async (req, res) => {
  const { oldPassword, email, username } = req.body;
  const id = req.params.id;

  const sql = `SELECT * FROM mb_user WHERE id = ?`;
  const [rows] = await db.query(sql, id);

  if (rows[0].password) {
    const result = await bcrypt.compare(oldPassword, rows[0].password);
    if (result) {
      await sendMail(transporter, id, email, username);
      return res.json({ success: true, message: "Right password" });
    } else {
      return res.json({
        success: false,
        code: 1,
        message: "Wrong old password",
      });
    }
  } else {
    if (oldPassword) {
      return res.json({
        success: false,
        code: 1,
        message: "Wrong old password",
      });
    }

    await sendMail(transporter, id, email, username);
    return res.json({ success: true, message: "There is no password yet" });
  }
});

router.post("/request-email", async (req, res) => {
  const output = {
    success: false,
    code: 0,
    message: "",
    sec: 0,
  };

  const { email } = req.body;
  try {
    const sql = `SELECT * FROM mb_user WHERE email = ?`;
    const [rows] = await db.query(sql, email);

    if (!rows.length) {
      output.code = 1;
      output.message = "Unregistered account";
      return res.json(output);
    }

    let id = rows[0].id;

    try {
      const sql = `SELECT * FROM mb_password_reset_tokens WHERE user_id = ?`;
      const [rows] = await db.query(sql, id);

      if (rows.length) {
        if (rows[0].expiry_time) {
          const exp = new Date(rows[0].expiry_time);
          const currentTime = new Date();
          if (exp > currentTime) {
            output.sec = Math.floor((exp - currentTime) / 1000);
            output.message = "Wait for the cool down time";
            output.code = 2;
            return res.json(output);
          }
        }
      }
    } catch (error) {
      console.log("Failed to get token info:", error);
    }

    try {
      await sendPasswordResetEmail(transporter, email, rows[0].id);
      res.json({ success: true, message: "Email sent" });
    } catch (error) {
      console.log("Something happened while sending the email", error);
    }
  } catch (error) {
    console.log("Error with the sql", error);
  }
});

router.post("/update-password", async (req, res) => {
  const { newPassword, token } = req.body;
  let id;
  let reqExpiry;

  if (!token) {
    return res.json({ success: false, code: 1, message: "Token is required" });
  }

  try {
    const sql = `SELECT * FROM mb_password_reset_tokens WHERE token = ?`;
    const [rows] = await db.query(sql, token);

    if (rows.length) {
      if (rows[0].used) {
        return res.json({
          success: false,
          code: 4,
          message: "This link is used already. Request new one",
        });
      }
    }
  } catch (error) {
    console.log("Failed to access token:", error);
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.json({
        success: false,
        code: 2,
        message: "Invalid or expired token",
      });
    }

    const { id: userId, reqExpiry: expiry } = decoded;
    id = userId;
    reqExpiry = new Date(expiry);
  });

  if (!id) {
    return res.json({ success: false, message: "User ID not found in token" });
  }

  if (reqExpiry < new Date()) {
    return res.json({ success: false, code: 3, message: "Token has expired" });
  }

  const hash = await bcrypt.hash(newPassword, 10);

  try {
    const sql = `UPDATE mb_user SET password = ? WHERE id = ?`;
    const [result] = await db.query(sql, [hash, id]);

    const updateTokenSql = `UPDATE mb_password_reset_tokens SET used = ? WHERE user_id = ?`;
    const [updateTokenResult] = await db.query(updateTokenSql, [true, id]);
  } catch (error) {
    console.log("Error updating the password:", error);
    return res.json({ success: false, message: "Failed to update password" });
  }

  return res.json({ success: true, message: "Updated the password" });
}); 

router.get("/get-preferences/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const sql = `SELECT * FROM mb_user_preference WHERE user_id = ?`;
    const [rows] = await db.query(sql, id);
    console.log(rows);
    return res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.log("Error getting data", error);
    return res.json({ success: false, message: "Something happened with sql" });
  }
});

router.post("/save-preferences/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const sql = `UPDATE mb_user_preference SET ? WHERE user_id = ?`;
    const [result] = await db.query(sql, [req.body, id]);
    return res.json({ success: true, message: "Updated successfully" });
  } catch (error) {
    console.log("Failed to update:", error);
    return res.json({ success: false, message: "Failed to update" });
  }
});

router.get("/get-notifications/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const todaySql = `SELECT n.*,
                      mb_user.username,
                      mb_user.profile_pic_url,
                      mb_user.google_photo,
                      sp.image_url AS post_image_url
                      FROM mb_notifications n
                      JOIN mb_user ON n.sender_id = mb_user.id
                      LEFT JOIN 
                      sn_posts sp ON n.resource_id = sp.post_id
                      WHERE n.user_id = ?
                      AND DATE(n.created_at) = CURDATE()
                      ORDER BY created_at DESC`;
    const lastWeekSql = `SELECT n.*,
                        mb_user.username,
                        mb_user.profile_pic_url,
                        mb_user.google_photo,
                        sp.image_url AS post_image_url
                        FROM mb_notifications n
                        JOIN mb_user ON n.sender_id = mb_user.id
                        LEFT JOIN 
                        sn_posts sp ON n.resource_id = sp.post_id
                        WHERE n.user_id = ? 
                        AND DATE(n.created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
                        AND DATE(n.created_at) < CURDATE()
                        ORDER BY created_at DESC`;
    const lastMonth = `SELECT n.*,
                      mb_user.username,
                      mb_user.profile_pic_url,
                      mb_user.google_photo,
                      sp.image_url AS post_image_url
                      FROM mb_notifications n
                      JOIN mb_user ON n.sender_id = mb_user.id
                      LEFT JOIN 
                      sn_posts sp ON n.resource_id = sp.post_id
                      WHERE n.user_id = ? 
                      AND DATE(n.created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                      AND DATE(n.created_at) < DATE_SUB(CURDATE(), INTERVAL 7 DAY)
                      ORDER BY created_at DESC`;
    const [todayRows] = await db.query(todaySql, id);
    const [lastWeekRows] = await db.query(lastWeekSql, id);
    const [lastMonthRows] = await db.query(lastMonth, id)

    return res.json({
      success: true,
      data: {
        today: todayRows,
        week: lastWeekRows,
        month: lastMonthRows,
      }
    });
  } catch (ex) {
    console.log("Error getting notification information:", ex);
    return res.json({ success: false });
  }
});


router.post("/subscribe", (req, res) => {
  const subscription = req.body;
  subscriptions.push(subscription);

  res.status(201).json({status: "success"});
});

let subscriptions = [];

router.post("/send-notification", (req, res) => {
  const notificationPayload = {
      title: "New Notification",
      body: "This is a new notification",
      icon: "https://some-image-url.jpg",
      data: {
        url: "https://example.com",
      },
  };

  Promise.all(
    subscriptions.map((subscription) =>
      webpush.sendNotification(subscription, JSON.stringify(notificationPayload))
    )
  )
    .then(() => res.status(200).json({ message: "Notification sent successfully." }))
    .catch((err) => {
      console.error("Error sending notification");
      res.sendStatus(500);
    });
});

router.post("/mark-read/:id", async (req, res) => {});

router.post("/create-notifications/:id", async (req, res) => {});

// router.get("/get-tour-info",  async (req, res) => {
//   try {
//     const sql = `SELECT * FROM tony_tour_post p 
//                   JOIN tony_tour_images i ON p.tour_id = i.tour_id 
//                   WHERE 1 
//                   GROUP BY i.tour_id
//                   ORDER BY i.tour_id DESC
//                   LIMIT 6`;
//     const [rows] = await db.query(sql)
//     return res.json({success: true, data: rows})
//   } catch (error) {
//     console.log("Error getting tour info:", error);
//     return res.json({success: false, message: "Error getting tour info"})
//   }
// })

router.get("/get-post", async (req, res) => {
  try {
    const sql = `SELECT * FROM sn_posts WHERE image_url IS NOT NULL ORDER BY view_count DESC LIMIT 1`
    const [rows] = await db.query(sql)
    return res.json({success: true, data: rows})
  } catch (error) {
    console.log("Error getting post info:", error);
    return res.json({success: false, message: "Error getting post info"})
  }
})

export default router;
