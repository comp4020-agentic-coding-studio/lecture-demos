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
    Repo.all(
      from m in Message,
        where: is_nil(m.parent_id),
        order_by: [desc: m.id],
        limit: ^limit,
        preload: [replies: ^replies_query()]
    )
  end

  def get_message!(id) do
    Repo.one!(
      from m in Message,
        where: m.id == ^id and is_nil(m.parent_id),
        preload: [replies: ^replies_query()]
    )
  end

  defp replies_query, do: from(r in Message, order_by: r.id)

  def change_reply(attrs \\ %{}) do
    Message.reply_changeset(%Message{}, attrs)
  end

  def change_message(message \\ %Message{}, attrs \\ %{}) do
    Message.changeset(message, attrs)
  end

  def create_message(attrs) do
    with {:ok, message} <- %Message{} |> Message.changeset(attrs) |> Repo.insert() do
      message = %{message | replies: []}
      Phoenix.PubSub.broadcast(LectureDemos.PubSub, @topic, {:new_message, message})
      {:ok, message}
    end
  end

  def create_reply(parent_id, attrs) do
    # replies are one level deep: the parent must itself be a top-level message
    parent = Repo.one!(from m in Message, where: m.id == ^parent_id and is_nil(m.parent_id))

    with {:ok, _reply} <-
           %Message{parent_id: parent.id} |> Message.reply_changeset(attrs) |> Repo.insert() do
      # the whole thread is re-sent: the parent with its replies, in order
      parent = Repo.preload(parent, [replies: replies_query()], force: true)
      Phoenix.PubSub.broadcast(LectureDemos.PubSub, @topic, {:updated_message, parent})
      {:ok, parent}
    end
  end
end
