Template.postSubmit.rendered = function(template) {
  var tags = Tags.find({}).fetch();
  var tagNames = _.map(tags, function(tag) { return tag.name; });
  $(this.find('input.editable')).select2({tags: tagNames});
};

Template.postSubmit.events({
  'submit form': function(e) {
    e.preventDefault();
    
    var post = {
      // url: $(e.target).find('[name=url]').val(),
      title: $(e.target).find('[name=title]').val(),
      message: $(e.target).find('[name=message]').val(),
      audience: $(e.target).find('[name=audience]').val()
    }
    
    Meteor.call('post', post, function(error, id) {
      if (error) {
        // display the error to the user
        throwError(error.reason);
        
        if (error.error === 302)
          Router.go('postPage', {_id: error.details})
      } else {
        Router.go('postPage', {_id: id});
      }
    });
  }
});