module.exports = {
    checkForErrors: checkForErrors,
}


function checkForErrors (err) {
  if (err) {
    console.log('An error occurred', err);
    return err;
  }
}