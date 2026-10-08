defmodule LectureDemosWeb.BoardLive do
  use LectureDemosWeb, :live_view

  alias LectureDemos.Board

  @emoji ~w(👍 ❤️ 😂 🎉 🔥 😮 🤔 👀)

  @impl true
  def mount(_params, _session, socket) do
    # the first render is plain HTTP; only the WebSocket-connected one subscribes
    if connected?(socket), do: Board.subscribe()

    {:ok,
     socket
     |> assign(:page_title, "Board")
     |> assign(:form, to_form(Board.change_message()))
     |> assign(:emoji, @emoji)
     |> assign(:reply_to, nil)
     |> assign(:reply_form, to_form(Board.change_reply(), as: :reply))
     |> stream(:messages, Board.list_messages())}
  end

  @impl true
  def handle_event("validate", %{"message" => params}, socket) do
    changeset = Board.change_message(%Board.Message{}, params)
    {:noreply, assign(socket, :form, to_form(changeset, action: :validate))}
  end

  def handle_event("save", %{"message" => params}, socket) do
    case Board.create_message(params) do
      {:ok, _message} ->
        # the broadcast inserts it here too, like every other open tab
        {:noreply, assign(socket, :form, to_form(Board.change_message()))}

      {:error, changeset} ->
        {:noreply, assign(socket, :form, to_form(changeset))}
    end
  end

  def handle_event("reply_to", %{"id" => id}, socket) do
    {:noreply,
     socket
     |> assign(:reply_to, String.to_integer(id))
     |> assign(:reply_form, to_form(Board.change_reply(), as: :reply))}
  end

  def handle_event("cancel_reply", _params, socket) do
    {:noreply, assign(socket, :reply_to, nil)}
  end

  def handle_event("reply_validate", %{"reply" => params}, socket) do
    changeset = Board.change_reply(params)
    {:noreply, assign(socket, :reply_form, to_form(changeset, as: :reply, action: :validate))}
  end

  # a palette button: append the emoji to whatever has been typed so far
  def handle_event("emoji", %{"emoji" => emoji}, socket) do
    params = %{
      "body" => (socket.assigns.reply_form[:body].value || "") <> emoji,
      "gif_url" => socket.assigns.reply_form[:gif_url].value
    }

    {:noreply, assign(socket, :reply_form, to_form(Board.change_reply(params), as: :reply))}
  end

  def handle_event("reply_save", %{"reply" => params}, socket) do
    case Board.create_reply(socket.assigns.reply_to, params) do
      {:ok, _parent} ->
        {:noreply,
         socket
         |> assign(:emoji, @emoji)
         |> assign(:reply_to, nil)
         |> assign(:reply_form, to_form(Board.change_reply(), as: :reply))}

      {:error, changeset} ->
        {:noreply, assign(socket, :reply_form, to_form(changeset, as: :reply, action: :insert))}
    end
  end

  @impl true
  def handle_info({:new_message, message}, socket) do
    {:noreply, stream_insert(socket, :messages, message, at: 0)}
  end

  # an existing id is updated in place, so the thread grows where it sits
  def handle_info({:updated_message, message}, socket) do
    {:noreply, stream_insert(socket, :messages, message)}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <Layouts.app flash={@flash}>
      <h1 class="text-2xl font-semibold">Board</h1>

      <.form for={@form} id="message-form" phx-change="validate" phx-submit="save">
        <.input field={@form[:body]} type="textarea" label="Message" />
        <.button variant="primary" phx-disable-with="Posting…">Post</.button>
      </.form>

      <ol id="messages" phx-update="stream" class="space-y-2">
        <li :for={{id, message} <- @streams.messages} id={id} class="card bg-base-200 p-3">
          <p>{message.body}</p>
          <time datetime={DateTime.to_iso8601(message.inserted_at)} class="text-xs opacity-70">
            {Calendar.strftime(message.inserted_at, "%-d %b, %H:%M UTC")}
          </time>

          <ul :if={message.replies != []} class="mt-2 space-y-2 border-l-2 border-base-300 pl-3">
            <li :for={reply <- message.replies} id={"reply-#{reply.id}"}>
              <p :if={reply.body}>{reply.body}</p>
              <img
                :if={reply.gif_url}
                src={reply.gif_url}
                alt={"GIF reply#{if reply.body, do: ": " <> reply.body}"}
                loading="lazy"
                referrerpolicy="no-referrer"
                class="mt-1 max-h-48 rounded"
              />
              <time
                datetime={DateTime.to_iso8601(reply.inserted_at)}
                class="block text-xs opacity-70"
              >
                {Calendar.strftime(reply.inserted_at, "%-d %b, %H:%M UTC")}
              </time>
            </li>
          </ul>

          <button
            :if={@reply_to != message.id}
            type="button"
            phx-click="reply_to"
            phx-value-id={message.id}
            class="btn btn-ghost btn-xs mt-2 self-start"
          >
            Reply
          </button>

          <.form
            :if={@reply_to == message.id}
            for={@reply_form}
            id={"reply-form-#{message.id}"}
            phx-change="reply_validate"
            phx-submit="reply_save"
            class="mt-2"
          >
            <.input field={@reply_form[:body]} type="textarea" label="Reply" />
            <div class="mb-2 flex flex-wrap gap-1" role="group" aria-label="Quick emoji">
              <button
                :for={emoji <- @emoji}
                type="button"
                phx-click="emoji"
                phx-value-emoji={emoji}
                aria-label={"Add #{emoji}"}
                class="btn btn-ghost btn-sm"
              >
                {emoji}
              </button>
            </div>
            <.input
              field={@reply_form[:gif_url]}
              type="url"
              label="GIF link (giphy, tenor or imgur)"
              placeholder="https://media.giphy.com/..."
            />
            <.button variant="primary" phx-disable-with="Replying…">Reply</.button>
            <button type="button" phx-click="cancel_reply" class="btn btn-ghost">Cancel</button>
          </.form>
        </li>
      </ol>
    </Layouts.app>
    """
  end
end
