defmodule LectureDemos.Repo do
  use Ecto.Repo,
    otp_app: :lecture_demos,
    adapter: Ecto.Adapters.SQLite3
end
