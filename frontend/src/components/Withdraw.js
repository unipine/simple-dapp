import React from "react";

export function Withdraw({ withdraw }) {
  return (
    <div>
      <h4>Withdraw</h4>
      <div className="form-group col-3">
        <input className="btn btn-primary form-control" type="submit" value="Withdraw" onClick={() => withdraw()} />
      </div>
    </div>
  );
}
