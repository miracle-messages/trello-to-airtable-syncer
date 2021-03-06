const config = require('config');
const crypto = require('crypto');
const winston = require('../config/winston');
const express = require('express');
const WebhookController = require('./webhookController');

const router = express.Router();

/**
 * GET /, which Trello calls expecting a 200 when configuring its webhook. It doesn't pass the Trello model id it's been
 * setup for in any way (header, query param).
 */
router.get('/', function(req, res) {
  res.sendStatus(200);
});

/**
 * POST /, which Trello calls whenever an update occurs.
 */
router.post('/', function(req, res) {
  if (!verifyTrelloWebhookRequest(req, config.trello.secret, config.trello.callbackUrl)) {
    winston.error('Not a verified Trello webhook. Is your callbackURL correct?');
    res.sendStatus(500);
    return;
  }

  const { action } = req.body;

  if (typeof action === 'undefined') {
    winston.error('req.body.action is undefined');
    res.sendStatus(500);
    return;
  }

  new WebhookController().handleWebhook(action)
      .then(status => res.sendStatus(status));
});

function verifyTrelloWebhookRequest(request, secret, callbackURL) {
  const base64Digest = function (s) {
    return crypto.createHmac('sha1', secret).update(s).digest('base64');
  };
  const content = JSON.stringify(request.body) + callbackURL;
  const doubleHash = base64Digest(content);
  const headerHash = request.headers['x-trello-webhook'];
  return doubleHash === headerHash;
}

module.exports = router;
