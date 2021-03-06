'use strict';

var React = require('react');
var Firebase = require('firebase');
var uuid = require('node-uuid');
var styles = require('./styles');

class Count extends React.Component {
  static propTypes = {
    firebaseHost: React.PropTypes.string.isRequired,
    firebaseResourceId: React.PropTypes.string.isRequired,
    allowMultiple: React.PropTypes.bool,
    isViewCounter: React.PropTypes.bool,
    isOnlineCounter: React.PropTypes.bool,
    isUndoable: React.PropTypes.bool,
    isReadonly: React.PropTypes.bool,
    isButtonLast: React.PropTypes.bool,
    counterText: React.PropTypes.string,
    actionDoText: React.PropTypes.string,
    actionUndoText: React.PropTypes.string,
    actionDoneText: React.PropTypes.string,
    className: React.PropTypes.string,
  };

  static defaultProps = {
    allowMultiple: false,
    isViewCounter: false,
    isReadonly: false,
    isOnlineCounter: false,
    isUndoable: false,
    isButtonLast: false,
    counterText: '',
    actionDoText: '',
    actionDoneText: '',
    actionUndoText: '',
    className: 'react-count'
  };

  constructor(props) {
    super(props);
    this.lsVotedKey = 'count-' + props.firebaseResourceId + '-voted';
    var voted = false;
    if (isLocalStorageOn()) {
      voted = !!localStorage.getItem(this.lsVotedKey);
    }
    var userid;
    if (props.isOnlineCounter == true) {
      userid = uuid.v4();
    }

    this.state = {
      counterValue: 0,
      voted: voted,
      counted: false,
      userid: userid
    };
  }

  componentWillMount() {
    if (this.props.isOnlineCounter == true) {
      var amOnline = new Firebase(this.props.firebaseHost + '.info/connected');
      var presenceUrl = this.props.firebaseHost + this.props.firebaseResourceId + '/presence';
      console.log('presenceUrl', presenceUrl);
      var usersRef = new Firebase(presenceUrl);
      var userRef = usersRef.child(this.state.userid);
      this.onlineFirebaseRef = amOnline;
      this.usersRef = usersRef;
      this.userFirebaseRef = userRef;
    } else {
      var url = this.props.firebaseHost + this.props.firebaseResourceId;
      this.firebase = new Firebase(url);
    }
  }

  componentDidMount() {
    if (this.props.isOnlineCounter == true) {
      this.onlineFirebaseRef.on('value', this.handleFirebaseOnline);
      this.usersRef.on('value', this.handleFirebaseUsers);
    } else {
      this.firebase.on('value', this.handleFirebaseChange);
    }
  }

  componentWillUnmount() {
    if (this.props.isOnlineCounter == true) {
      this.onlineFirebaseRef.off('value', this.handleFirebaseOnline);
      this.usersRef.off('value', this.handleFirebaseUsers);
    } else {
      this.firebase.off('value', this.handleFirebaseChange);
    }
  }

  handleFirebaseOnline = (snapshot) => {
    if (snapshot.val()) {
      this.userFirebaseRef.onDisconnect().set(null);
      this.userFirebaseRef.set(true);
    }
  };

  handleFirebaseUsers = (snapshot) => {
    var numOfUsersOnline = snapshot.numChildren();
    this.setState({counterValue: numOfUsersOnline});
  };

  handleFirebaseChange = (snapshot) => {
    var newValue = snapshot.val();
    if (newValue == null) {
      newValue = 0;
      this.firebase.set(newValue);
    }
    if (this.props.isViewCounter === true && this.state.counted === false) {
      newValue = newValue + 1;
      this.setState({ counted: true });
      this.firebase.set(newValue);
    }
    this.setState({counterValue: newValue});
  };

  isReadonly = () => {
    return this.props.isReadonly === true || this.props.isViewCounter === true;
  };

  isNotVotable = () => {
    return this.props.allowMultiple === false && this.state.voted === true;
  };

  incrementAndSave = () => {
    var newValue = this.state.counterValue + 1;
    this.firebase.set(newValue);
    this.setState({voted: true});
    if (isLocalStorageOn()) {
      localStorage.setItem(this.lsVotedKey, true);
    }
  };

  decrementAndSave = () => {
    var newValue = this.state.counterValue - 1;
    this.firebase.set(newValue);
    this.setState({voted: false});
    if (isLocalStorageOn()) {
      localStorage.removeItem(this.lsVotedKey);
    }
  };

  handleClick = () => {
    if (this.isReadonly()) {
      return;
    }
    if (this.props.isUndoable === false && this.isNotVotable()) {
      return;
    }
    if (this.props.isUndoable === true) {
      // already voted. we need to unvote
      if (this.state.voted === true) {
        this.decrementAndSave();
      } else {
        this.incrementAndSave();
      }
    } else {
      this.incrementAndSave();
    }
  };

  buildClassName = () => {
    var className = this.props.className;
    if (this.isReadonly()) {
      className += ' readonly';
    }
    if (this.state.voted === true) {
      className += ' voted';
    }
    // trim leading whitespace
    if (className.trim) {
      className = className.trim();
    }
    return className;
  };

  render() {
    var buttonStyle = {};
    if (this.isReadonly() || this.props.isOnlineCounter === true) {
      buttonStyle.display = 'none';
    }
    var className = this.buildClassName();
    var countClassName = this.props.className + '-cnt';
    var btnClassName = this.props.className + '-btn';
    var actionText = this.props.actionDoText;
    if (this.state.voted === true) {
      if (this.props.isUndoable === true) {
        actionText = this.props.actionUndoText;
      } else {
        actionText = this.props.actionDoneText;
      }
    }
    var button = <button className={btnClassName} styles={[styles.reactCountBtn, styles.reactCountBtnCnt, buttonStyle]}>{actionText}</button>;
    var text = <span className={countClassName} styles={[styles.reactCountBtnCnt, styles.reactCountCnt]}>{this.state.counterValue} {this.props.counterText}</span>;
    var subcomponents = [];
    if (this.props.isButtonLast) {
      subcomponents.push(text);
      subcomponents.push(button);
    } else {
      subcomponents.push(button);
      subcomponents.push(text);
    }
    return (
      <div key={this.props.firebaseResourceId} className={className} onClick={this.handleClick} styles={styles.reactCount}>
        {subcomponents}
      </div>
    )
  }
}

function isLocalStorageOn () {
  // this code is borrowed from modernizer
  var mod = 'react-count';
  try {
    localStorage.setItem(mod, mod);
    localStorage.removeItem(mod);
    return true;
  } catch(e) {
    return false;
  }
}

module.exports = Count;