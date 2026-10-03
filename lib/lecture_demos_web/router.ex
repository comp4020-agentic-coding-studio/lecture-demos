defmodule LectureDemosWeb.Router do
  use LectureDemosWeb, :router

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_live_flash
    plug :put_root_layout, html: {LectureDemosWeb.Layouts, :root}
    plug :protect_from_forgery
    plug :put_secure_browser_headers
  end

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/", LectureDemosWeb do
    pipe_through :browser

    live "/", BoardLive
    get "/readme/", ReadmeController, :show
  end

  # Other scopes may use custom stacks.
  # scope "/api", LectureDemosWeb do
  #   pipe_through :api
  # end
end
