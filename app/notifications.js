const CronJob = require('cron').CronJob;

const User = require('./models/user');
const Bot = require('../Bot');

new CronJob({
  cronTime: '01 07-16 * * *', // Should run every hour between 10 and 19
  onTick: function () {
    sendNotifications();
  },
  start: true,
  timeZone: 'America/Los_Angeles' // CHANGE BEFORE CONFERENCE
});

function sendNotifications () {
  User
    .find({
      hasBeenNotified: false
    }, function (error, users) {
      if (error) {
        return error;
      }
      for (let i = 0; i < users.length; i++) {
        if (users[i].favorites.length < 1) {
          return;
        }
        console.log('Sending notif to ', users[i].fb_id);
        let actor = users[i].favorites[0];
        Bot.reply(users[i].fb_id, `You bookmarked ${actor}, remember?`, function () {
          Bot.reply(users[i].fb_id, `Don't worry ${users[i].fb_first_name}, we won't bother you again 😉`, function () {
            Bot.sendSingleActor(users[i].fb_id, actor);
          });
        });
        users[i].hasBeenNotified = true;
        users[i].save(function (err) {
          if (err) {
            return (err);
          }
        });
      }
    });
}
