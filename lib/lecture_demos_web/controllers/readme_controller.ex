defmodule LectureDemosWeb.ReadmeController do
  use LectureDemosWeb, :controller

  # README.md, rendered at compile time: what this app is and what good looks
  # like here, published with the app. spec/readme.test.ts checks the whole of
  # it is here.
  @readme_path Path.expand("../../../README.md", __DIR__)
  @external_resource @readme_path
  @readme_html @readme_path |> File.read!() |> MDEx.to_html!()

  def show(conn, _params) do
    conn
    |> assign(:page_title, "About")
    |> render(:show, readme_html: Phoenix.HTML.raw(@readme_html))
  end
end
