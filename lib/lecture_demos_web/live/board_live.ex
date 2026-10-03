defmodule LectureDemosWeb.BoardLive do
  use LectureDemosWeb, :live_view

  alias LectureDemos.Board

  @impl true
  def mount(_params, _session, socket) do
    # the first render is plain HTTP; only the WebSocket-connected one subscribes
    if connected?(socket), do: Board.subscribe()

    {:ok,
     socket
     |> assign(:page_title, "Board")
     |> assign(:form, to_form(Board.change_message()))
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

  @impl true
  def handle_info({:new_message, message}, socket) do
    {:noreply, stream_insert(socket, :messages, message, at: 0)}
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
        </li>
      </ol>
    </Layouts.app>
    """
  end
end
