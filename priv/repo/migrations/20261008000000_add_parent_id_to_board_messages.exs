defmodule LectureDemos.Repo.Migrations.AddParentIdToBoardMessages do
  use Ecto.Migration

  def change do
    # replies are board_messages rows pointing at their parent; one level only
    alter table(:board_messages) do
      add :parent_id, references(:board_messages, on_delete: :delete_all)
      add :gif_url, :text
    end

    create index(:board_messages, [:parent_id])
  end
end
