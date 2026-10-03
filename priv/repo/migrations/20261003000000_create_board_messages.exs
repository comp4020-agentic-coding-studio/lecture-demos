defmodule LectureDemos.Repo.Migrations.CreateBoardMessages do
  use Ecto.Migration

  def change do
    # the guestbook's `messages` table is still on the Fly volume, rows and all
    create table(:board_messages) do
      add :body, :text, null: false

      timestamps(type: :utc_datetime)
    end
  end
end
