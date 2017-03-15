const CronJob = require('cron').CronJob;

const User = require('./models/user');
const Bot = require('../Bot');

// Background job that runs every hour between 10 and 19
new CronJob({
  cronTime: '01 07-16 * * *',
  onTick: function () {
    sendNotifications();
  },
  start: true,
  timeZone: 'America/Los_Angeles'
});

// Send users who haven't been notified yet information about an actor they bookmarked
function sendNotifications () {
  // Find users that haven't been notified yet
  User
    .find({
      hasBeenNotified: false
    }, function (error, users) {
      if (error) {
        return error;
      }
      // Keep only those who bookmarked an actor
      for (let i = 0; i < users.length; i++) {
        if (users[i].favorites.length < 1) {
          return;
        }
        // Take their 1st favorite and send list template
        console.log('Sending notif to ', users[i].fb_id);
        let actor = users[i].favorites[0];
        Bot.reply(users[i].fb_id, `You bookmarked ${actor}, remember?`, function () {
          Bot.reply(users[i].fb_id, `Don't worry ${users[i].fb_first_name}, we won't bother you again 😉`, function () {
            Bot.sendSingleActor(users[i].fb_id, actor);
          });
        });
        // Update user so that he never gets notified again
        users[i].hasBeenNotified = true;
        users[i].save(function (err) {
          if (err) {
            return (err);
          }
        });
      }
    });
}
