import React, { Component } from 'react';
import 'bootstrap/dist/css/bootstrap.css';
import './App.css'; 
import web3 from './web3';
import lotteryballot from './lotteryballot';


class App extends Component {
  state = {
    owner: '',
    items: [],
    balance: '',
    drawFlag: false,
    currentAccount: '',
    newOwnerAddress: '',
    value: '',
    message: '',
    winnerMessage:''
  };

  
  async componentDidMount() {
    try {
      const isMetaMaskInstalled = typeof window.ethereum !== 'undefined';
      
      if (!isMetaMaskInstalled) {
        this.setState({ message: 'MetaMask is not installed' });
        return;
      }
  
      // Check if MetaMask is connected
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
  
      if (accounts.length === 0) {
        this.setState({ message: 'MetaMask is not connected' });
        return;
      }
  
      const owner = await lotteryballot.methods.owner().call();
      const items = await lotteryballot.methods.getItems().call();
      const balance = await web3.eth.getBalance(lotteryballot.options.address);
  
      this.setState({ message: '', owner, items, balance });
  
      if (!this.eventListenersSet) {
        this.setupEventListeners();
        this.eventListenersSet = true;
      }
  
      const currentAccount = accounts[0];
      this.setState({ message: '', currentAccount });
    } catch (error) {
      console.error(error);
      this.setState({ message: 'Error during MetaMask initialization' });
    }
  
    this.refreshDataInterval = setInterval(this.refreshData, 1000);
  }

  refreshData = async () => {
    try {
      // Ανανέωση των δεδομένων
      const items = await lotteryballot.methods.getItems().call();
      const balance = await web3.eth.getBalance(lotteryballot.options.address);
      this.setState({ items, balance, });
    } catch (error) {
      console.error(error);
      this.setState({ message: "Error during data refresh." });
    }
  };

  setupEventListeners() {
    // Κάθε φορά που επιλέγεται άλλο πορτοφόλι στο metamask...
    window.ethereum.on('accountsChanged', (accounts) => {
      // ... να γίνεται refresh η σελίδα
      const currentAccount = accounts[0];
      this.setState({message:'',winnerMessage: '',  currentAccount });
    });

  }

 

  transferOwnership = async () => {
    try {
      await lotteryballot.methods.transferOwnership(this.state.newOwnerAddress).send({
        from: this.state.currentAccount
      });

      this.setState({ owner: this.state.newOwnerAddress, message: 'Ownership transferred successfully!' });
    } catch (error) {
      this.setState({ message: 'Failed to transfer ownership.' });
    }
  };

  

  // Όταν πατηθεί το κουμπί "Withdraw"
  doWithdraw = async () => {
    try {
      await lotteryballot.methods.withdraw().send({
        from: this.state.currentAccount
      });

      // Ανανεώστε το υπόλοιπο του συμβολαίου και το μήνυμα
      const balance = await web3.eth.getBalance(lotteryballot.options.address);
      this.setState({ balance, message: 'Withdrawal successful!' });
    } catch (error) {
      this.setState({ message: 'Withdrawal failed.' });
    }
  };

  startNewRound = async () => {
    try {
      await lotteryballot.methods.reset().send({
        from: this.state.currentAccount
      });

      // Ανανεώστε τα δεδομένα της εφαρμογής
      const items = await lotteryballot.methods.getItems().call();
      const drawFlag = await lotteryballot.methods.getFlag().call();
      const balance = await web3.eth.getBalance(lotteryballot.options.address);
      this.setState({ items, drawFlag, balance, message: 'New round started!',winnerMessage:'' });
    } catch (error) {
      this.setState({ message: 'Failed to start a new round.' });
    }
  };

  declareWinner = async () => {
    try {
        await lotteryballot.methods.declareWinner().send({
            from: this.state.currentAccount
        });

        // Ανανέωση των δεδομένων της εφαρμογής μετά την κλήρωση
        
        const drawFlag = await lotteryballot.methods.getFlag().call();
        const balance = await web3.eth.getBalance(lotteryballot.options.address);
        this.setState({ drawFlag, balance, message: 'Winners declared!' });
    } catch (error) {
        this.setState({ message: 'Failed to declare winners.' });
    }
  };

  bid = async (itemIndex) => {
    try {
      const bidAmount = web3.utils.toWei("0.01", "ether");
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const userAccount = accounts[0];

      // Ελέγχουμε αν έχει γίνει ήδη κλήρωση
      if (this.state.drawFlag) {
        this.setState({ message: "Drawing has already occurred. Cannot bid now." });
        return;
      }

      // Ελέγχουμε αν ο χρήστης είναι ο ιδιοκτήτης
      if (userAccount.toLowerCase() === this.state.owner.toLowerCase()) {
        this.setState({ message: "Owner cannot bid." });
        return;
      }

      // Κάνουμε τον χρήστη να πληρώσει
      await lotteryballot.methods.bid(itemIndex).send({
        from: userAccount,
        value: bidAmount,
      });

      this.setState({ message: "Bid successful." });
    } catch (error) {
      console.error(error);
      this.setState({ message: "Error during bid." });
    }
  };

  amIWinner = async () => {
    try {
        const result = await lotteryballot.methods.amIwinner().call({ from: this.state.currentAccount });

        if (result.length > 0) {
            this.setState({ winnerMessage: `Congratulations! You won the following items: ${result.join(', ')}` });
        } else {
            this.setState({ winnerMessage: 'Sorry, you did not win anything.' });
        }
    } catch (error) {
        console.error(error);
        this.setState({ message: 'Error checking winner status.' });
    }
  };
  
  selfDestruct = async () => {
    try {
      await lotteryballot.methods.selfDestruct().send({
        from: this.state.currentAccount
      });

      this.setState({ message: 'Contract has been self-destructed!' });
    } catch (error) {
      this.setState({ message: 'Failed to self-destruct the contract.' });
    }
  };

  // Κάθε φορά που η σελίδα γίνεται refresh
  render() {
    return (
    <div className="container">
      <h2>Lottery Ballot</h2>
      <p>Owner: {this.state.owner}</p>
      <p>Current Account: {this.state.currentAccount}</p>
      <p>Contract Balance: {web3.utils.fromWei(this.state.balance, 'ether')} ETH</p>
      <hr/>
      
      {this.state.items.map((item, index) => (
          <div key={index}>
            <p>{item.name} - Sold Tokens: {item.itemTokens.length}</p>
            <button className="btn btn-primary" onClick={() => this.bid(index)}>Bid</button>
          </div>
        ))}
      <hr/>
      <button className="btn btn-info" onClick={this.amIWinner} disabled={!this.state.drawFlag}> Am I Winner </button>
      <p>{this.state.winnerMessage}</p>
      <hr/>
      <button className="btn btn-success" onClick={this.declareWinner} disabled={this.state.currentAccount !== this.state.owner.toLowerCase()}>
        Declare Winner
      </button>
      {" "}
      <button className="btn btn-primary" onClick={this.doWithdraw} disabled={this.state.currentAccount !== this.state.owner.toLowerCase()}>
          Withdraw
      </button>
      {" "}
      <button className="btn btn-primary" onClick={this.startNewRound} disabled={this.state.currentAccount !== this.state.owner.toLowerCase()}>
          Start New Round
      </button>

      <div>
        <label>New Owner Address:</label>
        <input
          type="text"
          value={this.state.newOwnerAddress}
          onChange={(e) => this.setState({ newOwnerAddress: e.target.value })}/>
        {" "}
        <button className="btn btn-primary" onClick={this.transferOwnership} disabled={this.state.currentAccount !== this.state.owner.toLowerCase()}>
          Transfer Ownership
        </button>
      </div>
      <button className="btn btn-danger" onClick={this.selfDestruct} disabled={this.state.currentAccount !== this.state.owner.toLowerCase()}>
        Self Destruct
      </button>
      
        
      <p>{this.state.message}</p>
    </div>
      
    );
  }
}

export default App;