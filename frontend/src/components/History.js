import React from "react";
import { ethers } from "ethers";

export function History({ history }) {
  return (
    <div>
      <h4>History</h4>
      <ul>
        {history.map((log, ind) => 
          <li key={`history-log-${ind}`}>
            {`
              ${log.user}
              : ${log.time.toString()}
              : ${parseFloat(ethers.utils.formatEther(log.amount.toString())).toFixed(3)} ETH
              : ${log.getReward ? "rewarded" : "not yet"}
            `}
          </li>
        )}
      </ul>
    </div>
  );
}
