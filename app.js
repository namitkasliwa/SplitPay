const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const details = require("./server/models/paymentSchema");
const splitpayment = require("./server/models/splitSchema");
const userCreate = require("./server/routes/user");

const uri =
  "mongodb+srv://Manav:Manav123@cluster0.k0njo.mongodb.net/SplitPay?retryWrites=true&w=majority";

const app = express();
app.use(bodyParser.urlencoded({ extended: true, limit: "30mb" }));
app.use(bodyParser.json({ extended: true }));
app.use(cors());

require("dotenv").config();
app.use("/createUser", userCreate);

let accessToken;
let user;
const PORT = process.env.PORT || 9000;

mongoose
  .connect(uri, {
    useCreateIndex: true,
    useFindAndModify: false,
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    res.json("Connection Completed");
  })
  .catch((err) => {
    res.json(err);
  });

app.listen(PORT, () => {
  console.log("Server Started");
});

const conn = mongoose.connection;

conn.on("open", () => {
  console.log("Success");
});

app.use(express.json());
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use("/css", express.static(__dirname + "public/css"));
app.use("/css", express.static(__dirname + "public/images"));

// //////////////////
// ROUTES
// //////////////////

app.get("/", (req, res) => {
  res.redirect("/login");
});

app.get("/updatePay", (req, res) => {
  res.sendFile(__dirname + "/views/updatePay.html");
});

app.get("/login", (req, res) => {
  res.sendFile(__dirname + "/views/login.html");
});

app.get("/signup", (req, res) => {
  res.sendFile(__dirname + "/views/signup.html");
});

app.get("/makeUserPayment", (req, res) => {
  res.sendFile(__dirname + "/views/pay.html");
});

app.get("/deletePay", (req, res) => {
  res.sendFile(__dirname + "/views/deletePay.html");
});

app.get("/splits", async (req, res) => {
  res.sendFile(__dirname + "/views/newSplit.html");
});

app.get("/getSplits", async (req, res) => {
  res.sendFile(__dirname + "/views/splitCollect.html");
});

app.get("/splitDebt", async (req, res) => {
  res.sendFile(__dirname + "/views/splitDebt.html");
});

app.get("/settleDebt", async (req, res) => {
  res.sendFile(__dirname + "/views/settleUp.html");
});

app.get("/userSettings", async (req, res) => {
  res.sendFile(__dirname + "/views/userSettings.html");
});

// //////////////////
// AUTHENTICATION
// //////////////////

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.json(err);
    req.user = user;
    next();
  });
}

// //////////////////
// CONTROLLERS
// //////////////////

app.post("/createToken", async (req, res) => {
  try {
    const checkAll = await conn
      .collection("userdetails")
      .findOne({ emailId: req.body.uEmail });
    if (bcrypt.compare(checkAll.password, req.body.uPass)) {
      user = checkAll;
      accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET);
      console.log(accessToken);
      console.log(user);
      res.redirect("/home");
      // console.log(accessToken)
      console.log("Login Success");
    } else {
      res.redirect("/signup");
    }
  } catch (err) {
    res.redirect("/signup");
    console.log(err);
  }
});

app.post("/updateDet", (req, res) => {
  // console.log(req.body)
  const makeUpdate = conn
    .collection("details")
    .updateOne(
      { payer: req.body.payerNum },
      {
        $set: { payee: req.body.updateVal },
      }
    )
    .then((results) => {
      res.redirect("/home");
    })
    .catch((error) => {
      console.log(error);
    });
  // console.log(makeUpdate)
});

app.post("/deleteDet", (req, res) => {
  // console.log(req.body)
  const makeUpdate = conn
    .collection("details")
    .deleteOne({ payer: req.body.payerDel })
    .then((result) => {
      // console.log(result)
      res.redirect("/home");
    })
    .catch((error) => {
      console.log(error);
    });
});

app.get("/home", (req, res) => {
  const cursor1 = conn
    .collection("details")
    .find()
    .toArray()
    .then((results) => {
      // console.log(results)
      res.sendFile(__dirname + "/views/home.html");
    })
    .catch((error) => console.log(error));
  // console.log(cursor1);
});

// app.post("/pays", (req, res) => {
// console.log(req.body);
// });

app.get("/fetchUserDetail", authenticateToken, async (req, res) => {
  res.json(user);
});

app.get("/fetchTransactions", authenticateToken, async (req, res) => {
  const userTrans = await conn
    .collection("details")
    .find({
      $or: [
        { payer: user.phoneNo.toString() },
        { payee: user.phoneNo.toString() },
      ],
    })
    .toArray();
  let paymentArray = [];
  userTrans.forEach(async (element) => {
    let payerName = await conn
      .collection("userdetails")
      .find({ phoneNo: Number(element.payer) })
      .toArray();
    let payeeName = await conn
      .collection("userdetails")
      .find({ phoneNo: Number(element.payee) })
      .toArray();
    let transObject = {
      giverName: payerName[0].name,
      getterName: payeeName[0].name,
      giveReason: element.note,
      giveAmt: element.amount,
      giveImg: payerName[0].userImage,
      getImg: payeeName[0].userImage,
    };
    paymentArray.push(transObject);
    if (paymentArray.length == userTrans.length) {
      res.json(paymentArray);
    }
  });
});

app.get("/fetchToken", async (req, res) => {
  res.json(accessToken);
});

app.post("/makeSplit", authenticateToken, async (req, res) => {
  const userLength = req.body.length;
  const amtDiv = req.body.amount / userLength;
  let splitUsers = req.body.payee;
  const splitReason = req.body.reason;
  let i = 0;
  for (i = 0; i < userLength - 1; i++) {
    const userSplit = await conn
      .collection("splitpayments")
      .find({
        $and: [
          { splitPayer: user.phoneNo.toString() },
          { splitPayee: splitUsers[i].toString() },
        ],
      })
      .toArray();
    if (userSplit.length == 0) {
      let newSplit = new splitpayment({
        splitPayer: user.phoneNo,
        splitAmount: amtDiv,
        splitPayee: splitUsers[i],
        splitNote: splitReason,
      });
      let splitSave = await newSplit.save();
    } else {
      let paymentBalance = Number(userSplit[0].splitAmount) + Number(amtDiv);
      const splitUpdate = await conn
        .collection("splitpayments")
        .findOneAndUpdate(
          {
            $and: [
              { splitPayer: user.phoneNo.toString() },
              { splitPayee: splitUsers[i].toString() },
            ],
          },
          { $set: { splitAmount: Number(paymentBalance) } }
        );
    }
  }
  res.json("User Added Successfully");
  // console.log(splitUsers)
});

app.get("/showCollect", authenticateToken, async (req, res) => {
  const splitCollect = await conn
    .collection("splitpayments")
    .find({ splitPayer: user.phoneNo.toString() })
    .toArray();
  let splitArray = [];
  splitCollect.forEach(async (element) => {
    let splitCollectName = await conn
      .collection("userdetails")
      .find({ phoneNo: Number(element.splitPayee) })
      .toArray();
    let splitObject = {
      name1: splitCollectName[0].name,
      img1: splitCollectName[0].userImage,
      amount1: element.splitAmount,
      reason1: element.splitNote,
      number1: splitCollectName[0].phoneNo,
    };
    splitArray.push(splitObject);
    if (splitArray.length == splitCollect.length) {
      res.json(splitArray);
    }
  });
  // res.json(splitCollect)
});

app.get("/showDebt", authenticateToken, async (req, res) => {
  const splitDebt = await conn
    .collection("splitpayments")
    .find({ splitPayee: user.phoneNo.toString() })
    .toArray();
  let debtArray = [];
  splitDebt.forEach(async (element) => {
    let splitDebtName = await conn
      .collection("userdetails")
      .find({ phoneNo: Number(element.splitPayer) })
      .toArray();
    let DebtObject = {
      name2: splitDebtName[0].name,
      amount2: element.splitAmount,
      reason2: element.splitNote,
      number2: splitDebtName[0].phoneNo,
      img2: splitDebtName[0].userImage,
    };
    debtArray.push(DebtObject);
    if (debtArray.length == splitDebt.length) {
      res.json(debtArray);
    }
  });
});

app.get("/allSplits", authenticateToken, async (req, res) => {
  const splitAll = await conn
    .collection("splitpayments")
    .find({
      $or: [
        { splitPayee: user.phoneNo.toString() },
        { splitPayer: user.phoneNo.toString() },
      ],
    })
    .toArray();
  let allArray = [];
  splitAll.forEach(async (element) => {
    let splitName = await conn
      .collection("userdetails")
      .find({ phoneNo: Number(element.splitPayer) })
      .toArray();
    let debtName = await conn
      .collection("userdetails")
      .find({ phoneNo: Number(element.splitPayee) })
      .toArray();
    let allObject = {
      giverName: splitName[0].name,
      getterName: debtName[0].name,
      giveReason: element.splitNote,
      giveAmt: element.splitAmount,
      giverImg: splitName[0].userImage,
      getterImg: debtName[0].userImage,
    };
    allArray.push(allObject);
    if (allArray.length == splitAll.length) {
      res.json(allArray);
    }
  });
});

app.get("/settleUser/:id", authenticateToken, async (req, res) => {
  // console.log(req.params['id'])
  const splitBetween = await conn
    .collection("splitpayments")
    .find({
      $and: [
        { splitPayer: user.phoneNo.toString() },
        { splitPayee: req.params["id"].toString() },
      ],
    })
    .toArray();
  const userSplit = await conn
    .collection("userdetails")
    .find({ phoneNo: Number(req.params["id"]) })
    .toArray();

  const userArray = [];
  userArray.push(splitBetween);
  userArray.push(userSplit);
  res.json(userArray);
});

app.get("/settleOption", async (req, res) => {
  res.sendFile(__dirname + "/views/settleOptions.html");
});

app.get("/settlePayment/:id", authenticateToken, async (req, res) => {
  const settleCollect = await conn
    .collection("splitpayments")
    .deleteOne({
      $and: [
        { splitPayer: user.phoneNo.toString() },
        { splitPayee: req.params["id"].toString() },
      ],
    })
    .then((ans) => {
      res.sendFile(__dirname + "/views/paymentComplete.html");
    })
    .catch((err) => {
      console.log(err);
    });
});

app.post("/payment", authenticateToken, async (req, res) => {
  const makePayment = new details({
    payer: user.phoneNo,
    payee: req.body.payee,
    amount: req.body.amount,
    note: req.body.note,
  });
  try {
    const makeNew = await makePayment.save();
    res.redirect("/");
    // res.json(makeNew)
  } catch (err) {
    res.send(err);
  }
});
