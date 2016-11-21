// you think this is a joke, sonny?

module.exports = () => {
  return {
    post: function(metadata, message){
      return new Promise((res, rej) => {
        res({
          code: 201,
          message: 'myspace received your message.  as if it matters.',
          remoteId: '813553D',
          revision: '5eb63bbbe01eeed093cb22bb8f5acdc3',
          timestamp: new Date()
        });
      })
    }
  }
}