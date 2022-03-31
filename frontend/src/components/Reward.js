import React from "react";

export function Reward({ reward }) {
  return (
    <div>
      <h4>Reward</h4>
      <form
        onSubmit={(event) => {
          // This function just calls the reward callback with the
          // form's data.
          event.preventDefault();

          const formData = new FormData(event.target);
          const amount = formData.get("amount");

          amount && reward(amount);
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
          <input className="btn btn-info form-control" type="submit" value="Reward" />
        </div>
      </form>
    </div>
  );
}
