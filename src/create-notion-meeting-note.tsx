import { ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { Clipboard } from "@raycast/api";
import { AI } from "@raycast/api";
import { Client } from "@notionhq/client";
import invariant from "invariant";

//TODO: raycast://extensions/raycast/raycast-ai/ai-chat?context=%7B%22id%22:%22A5CF939B-C33E-4006-8DFA-7A7E0065E439%22%7D
//TODO: raycast://extensions/raycast/raycast-ai/ai-chat?context=%7B%22id%22:%22D59AF06F-33AB-4D34-9096-DE05216346DE%22%7D

// Check environment variables
invariant(process.env.NOTION_API_TOKEN, "NOTION_API_TOKEN environment variable is required");

// Initialize Notion client
const notion = new Client({ auth: process.env.NOTION_API_TOKEN });

async function getClipboardContent() {
  const content = await Clipboard.readText();
  return content;
}

async function processWithRaycastAI(content: string) {
  const prompt = `Extract a meeting agenda and action items from the following text:\n\n${content}`;
  const response = await AI.ask(prompt);
  return response;
}

async function addPageToNotion(agenda: string, actions: string) {
  const databaseId = process.env.NOTION_DATABASE_ID;
  invariant(databaseId, "NOTION_DATABASE_ID environment variable is required");
  try {
    await notion.pages.create({
      parent: { database_id: databaseId },
      properties: {
        Name: {
          title: [
            {
              text: {
                content: "Meeting Agenda",
              },
            },
          ],
        },
        Agenda: {
          rich_text: [{ text: { content: agenda } }],
        },
        Actions: {
          rich_text: [{ text: { content: actions } }],
        },
      },
    });
  } catch (error) {
    console.error("Error adding page to Notion:", error);
    throw error;
  }
}

export default function Command() {
  async function handleAction() {
    try {
      const content = await getClipboardContent();
      if (!content) {
        await showToast(Toast.Style.Failure, "No content in clipboard");
        return;
      }

      const processedContent = await processWithRaycastAI(content);
      const { agenda, actions } = JSON.parse(processedContent); // Assuming AI returns JSON

      await addPageToNotion(agenda, actions);
      await showToast(Toast.Style.Success, "Agenda and actions sent to Notion");
    } catch (error) {
      if (error instanceof Error) {
        await showToast(Toast.Style.Failure, "Failed to process clipboard content", error.message);
      }
    }
    1;
  }

  return (
    <ActionPanel>
      <Action title="Send to Notion" onAction={handleAction} />
    </ActionPanel>
  );
}
