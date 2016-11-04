module.exports = {
  post: function(message){
    return new Promise((res, rej) => {
      res({
        code: 201,
        message: 'myspace received your message.  as if it matters.'
      });
    })
  }
}