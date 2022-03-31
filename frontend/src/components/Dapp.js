import React from "react";

import { ethers } from "ethers";

import PoolArtifact from "../contracts/Pool.sol/Pool.json";
import address from "../contracts/Pool.sol/Address.json";

import { NoWalletDetected } from "./NoWalletDetected";
import { ConnectWallet } from "./ConnectWallet";
import { Loading } from "./Loading";
import { History } from "./History";
import { Deposit } from "./Deposit";
import { Withdraw } from "./Withdraw";
import { Reward } from "./Reward";
import { TransactionErrorMessage } from "./TransactionErrorMessage";
import { WaitingForTransactionMessage } from "./WaitingForTransactionMessage";

const ERROR_CODE_TX_REJECTED_BY_USER = 4001;

export class Dapp extends React.Component {
  constructor(props) {
    super(props);

    this.initialState = {
      poolData: undefined,
      selectedAddress: undefined,
      isAdmin: false,
      balance: undefined,
      depositAmount: 0,
      txBeingSent: undefined,
      transactionError: undefined,
      networkError: undefined,
    };

    this.state = this.initialState;
  }

  render() {
    if (window.ethereum === undefined) {
      return <NoWalletDetected />;
    }

    if (!this.state.selectedAddress) {
      return (
        <ConnectWallet
          connectWallet={() => this._connectWallet()}
          networkError={this.state.networkError}
          dismiss={() => this._dismissNetworkError()}
        />
      );
    }

    if (!this.state.poolData || !this.state.balance) {
      return <Loading />;
    }

    return (
      <div className="container p-4">
        <div className="row">
          <div className="col-12">
            <h1>
              {this.state.poolData.name} {this.state.poolData.version} ( {this.state.poolData.balance} ETH )
            </h1>
            <p>
              <b>{this.state.isAdmin ? "Admin " : "Your account "}</b>
              {this.state.selectedAddress} ( {this.state.balance.toString()} ETH )
            </p>
            {this.state.isAdmin ?
              <p>
                <b>You reward </b> {this.state.rewardData.amount} ETH ( {this.state.rewardData.time.toString()} )
              </p>
              :
              <p>
                <b>You deposited </b>
                {parseFloat(ethers.utils.formatEther(this.state.depositAmount.toString())).toFixed(3)} ETH
              </p>
            }
          </div>
        </div>

        <hr />

        <div className="row">
          <div className="col-12">
            {this.state.txBeingSent && (
              <WaitingForTransactionMessage txHash={this.state.txBeingSent} />
            )}

            {this.state.transactionError && (
              <TransactionErrorMessage
                message={this._getRpcErrorMessage(this.state.transactionError)}
                dismiss={() => this._dismissTransactionError()}
              />
            )}
          </div>
        </div>

        <div className="row">
          <div className="col-6">
            <History history={this.state.poolData.history} />
          </div>
          <div className="col-6">
            {this.state.isAdmin ?
              <Reward reward={amount => this._reward(amount)} />
              :
              <>
                <Deposit deposit={amount => this._deposit(amount)} />
                <hr />
                <Withdraw withdraw={() => this._withdraw()} />
              </>
            }
          </div>
        </div>
      </div>
    );
  }

  componentWillUnmount() {
    this._stopPollingData();
  }

  async _connectWallet() {
    const [selectedAddress] = await window.ethereum.request({ method: 'eth_requestAccounts' });

    this._initialize(selectedAddress);

    window.ethereum.on("accountsChanged", ([newAddress]) => {
      this._stopPollingData();

      if (newAddress === undefined) {
        return this._resetState();
      }

      this._initialize(newAddress);
    });

    window.ethereum.on("chainChanged", () => {
      this._stopPollingData();
      this._resetState();
    });
  }

  _initialize(userAddress) {
    this.setState({
      selectedAddress: userAddress,
      isAdmin: address.owner.toUpperCase() == userAddress.toUpperCase()
    });

    this._initializeEthers();
    this._getPoolData();
    this._startPollingData();
  }

  async _initializeEthers() {
    this._provider = new ethers.providers.Web3Provider(window.ethereum);

    this._pool = new ethers.Contract(
      address.address,
      PoolArtifact.abi,
      this._provider.getSigner(0)
    );
  }

  _startPollingData() {
    this._pollDataInterval = setInterval(() => this._updateBalance(), 1000);

    // We run it once immediately so we don't have to wait for it
    this._updateBalance();
    this._getPoolData();
  }

  _stopPollingData() {
    clearInterval(this._pollDataInterval);
    this._pollDataInterval = undefined;
  }

  async _getPoolData() {
    const name = await this._pool.name();
    const version = await this._pool.version();
    const balance = await this._provider.getBalance(address.address);
    const history = await this._pool.depositHistory();
    const rewardData = await this._pool.getRewardData();
    const rewardTime = parseInt(rewardData.time.toString())

    this.setState({
      poolData: {
        name,
        version,
        history,
        balance: this._parseBalance(balance)
      },
      rewardData: {
        amount: parseFloat(ethers.utils.formatEther(rewardData.amount)).toFixed(3),
        time: rewardTime ? rewardData.time.toString() : ""
      }
    });
  }

  async _updateBalance() {
    const balance = await this._provider.getBalance(this.state.selectedAddress);
    this.setState({ balance: this._parseBalance(balance) });

    if (this.state.poolData && !this.isAdmin) {
      const depositAmount =
        this.state.poolData.history.reduce((sum, log) => sum += (
          log.user.toUpperCase() == this.state.selectedAddress.toUpperCase() && !log.getReward ?
            parseInt(log.amount.toString()) : 0
        ), 0
        );
      this.setState({ depositAmount });
    }
  }

  async _deposit(amount) {
    try {
      this._dismissTransactionError();

      const tx = await this._pool.deposit({ value: ethers.utils.parseEther(amount) });
      this.setState({ txBeingSent: tx.hash });

      const receipt = await tx.wait();

      if (receipt.status === 0) {
        throw new Error("Transaction failed");
      }

      await this._updateBalance();
    } catch (error) {
      if (error.code === ERROR_CODE_TX_REJECTED_BY_USER) {
        return;
      }

      console.error(error);
      this.setState({ transactionError: error });
    } finally {
      this.setState({ txBeingSent: undefined });
      this._initialize(this.state.selectedAddress);
    }
  }

  async _reward(amount) {
    try {
      this._dismissTransactionError();

      const tx = await this._pool.reward({ value: ethers.utils.parseEther(amount) });
      this.setState({ txBeingSent: tx.hash });

      const receipt = await tx.wait();

      if (receipt.status === 0) {
        throw new Error("Transaction failed");
      }

      await this._updateBalance();
    } catch (error) {
      if (error.code === ERROR_CODE_TX_REJECTED_BY_USER) {
        return;
      }

      console.error(error);
      this.setState({ transactionError: error });
    } finally {
      this.setState({ txBeingSent: undefined });
      this._initialize(this.state.selectedAddress);
    }
  }

  async _withdraw() {
    try {
      this._dismissTransactionError();

      const tx = await this._pool.withdraw();
      this.setState({ txBeingSent: tx.hash });

      const receipt = await tx.wait();

      if (receipt.status === 0) {
        throw new Error("Transaction failed");
      }

      await this._updateBalance();
    } catch (error) {
      if (error.code === ERROR_CODE_TX_REJECTED_BY_USER) {
        return;
      }

      console.error(error);
      this.setState({ transactionError: error });
    } finally {
      this.setState({ txBeingSent: undefined });
      this._initialize(this.state.selectedAddress);
    }
  }

  _dismissTransactionError() {
    this.setState({ transactionError: undefined });
  }

  _dismissNetworkError() {
    this.setState({ networkError: undefined });
  }

  _getRpcErrorMessage(error) {
    if (error.data) {
      return error.data.message;
    }

    return error.message;
  }

  _resetState() {
    this.setState(this.initialState);
  }

  _parseBalance(balance) {
    return parseFloat(ethers.utils.formatEther(balance.toString())).toFixed(3);
  }
}
