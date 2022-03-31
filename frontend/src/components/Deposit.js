import React from "react";

export function Deposit({ deposit }) {
  return (
    <div>
      <h4>Deposit</h4>
      <form
        onSubmit={(event) => {
          // This function just calls the deposit callback with the
          // form's data.
          event.preventDefault();

          const formData = new FormData(event.target);
          const amount = formData.get("amount");

          amount && deposit(amount);
        }}
        className="row"
      >
        <label>Amount of ETH </label>
        <div className="form-group col-9">
          <input
            className="form-control"
            type="text"
            name="amount"
            placeholder="0.001"
            required
          />
        </div>
        <div className="form-group col-3">
          <input className="btn btn-success form-control" type="submit" value="Deposit" />
        </div>
      </form>
    </div>
  );
}
