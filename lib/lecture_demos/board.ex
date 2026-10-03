defmodule LectureDemos.Board do
  @moduledoc """
  The message board: saving a message and telling everyone who's watching.

  Every connected LiveView subscribes to one PubSub topic, and a saved message
  is broadcast to it once. The code that saves never needs to know who's
  watching.
  """

  import Ecto.Query
  alias LectureDemos.Board.Message
  alias LectureDemos.Repo

  @topic "messages"

  def subscribe, do: Phoenix.PubSub.subscribe(LectureDemos.PubSub, @topic)

  def list_messages(limit \\ 50) do
    Repo.all(from m in Message, order_by: [desc: m.id], limit: ^limit)
  end

  def change_message(message \\ %Message{}, attrs \\ %{}) do
    Message.changeset(message, attrs)
  end

  def create_message(attrs) do
    with {:ok, message} <- %Message{} |> Message.changeset(attrs) |> Repo.insert() do
      Phoenix.PubSub.broadcast(LectureDemos.PubSub, @topic, {:new_message, message})
      {:ok, message}
    end
  end
end
