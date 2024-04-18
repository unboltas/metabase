import userEvent from "@testing-library/user-event";

import { act, screen } from "__support__/ui";

import { changeInput, getSaveButton, setup } from "./test-utils";

describe("StrategyEditorForDatabases", () => {
  it("lets user change the default policy from Duration to TTL to No caching", async () => {
    setup();
    expect(
      screen.queryByRole("button", { name: "Save changes" }),
    ).not.toBeInTheDocument();

    const ttlStrategyRadioButton = await screen.findByRole("radio", {
      name: /TTL/i,
    });

    await userEvent.click(ttlStrategyRadioButton);

    expect((await screen.findAllByRole("spinbutton")).length).toBe(2);

    expect(await getSaveButton()).toBeInTheDocument();

    await act(async () => {
      await changeInput(/minimum query duration/i, 1, 5);
      await changeInput(/multiplier/i, 10, 3);
    });

    await userEvent.click(
      await screen.findByTestId("strategy-form-submit-button"),
    );

    // NOTE: There is no need to check that the submission of the form was successful.
    // It doesn't meaningfully change the state of the component on OSS

    const durationStrategyRadioButton = await screen.findByRole("radio", {
      name: /duration/i,
    });
    await userEvent.click(durationStrategyRadioButton);

    expect((await screen.findAllByRole("spinbutton")).length).toBe(1);

    await changeInput(/Cache results for this many hours/, 24, 48);

    await userEvent.click(
      await screen.findByTestId("strategy-form-submit-button"),
    );

    const noCacheStrategyRadioButton = await screen.findByRole("radio", {
      name: /Don.t cache/i,
    });
    await userEvent.click(noCacheStrategyRadioButton);

    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();

    (await screen.findByTestId("strategy-form-submit-button")).click();
  });
});
