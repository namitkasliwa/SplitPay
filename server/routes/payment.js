const express = require("express");
const router = express.Router();

const details = require("../models/paymentSchema");

router.get("", async (req, res) => {
  try {
    const paymentDetails = await details.find();
    res.json(paymentDetails);
  } catch (err) {
    res.send(err);
  }
});

router.post("/", async (req, res) => {
  const makePayment = new details({
    payer: req.body.payer,
    payee: req.body.payee,
    amount: req.body.amount,
  });

  try {
    const makeNew = await makePayment.save();
    res.redirect("/");
    res.json(makeNew);
  } catch (err) {
    res.send(err);
  }
});

module.exports = router;
