import { observer } from 'mobx-react';
import React from 'react';
import { format } from 'date-fns';
import Markdown from 'markdown-it';
import emoji from 'markdown-it-emoji';
import highlight from 'markdown-it-highlightjs';
import { Button, Card } from '@blueprintjs/core';

import { cooperComments } from '../../cooper/comments';
import { SleuthState } from '../../state/sleuth';

// Uses react-linkify
const markdown = new Markdown({ linkify: true })
  .use(highlight)
  .use(emoji);

const debug = require('debug')('sleuth:comment');

export interface CommentProps {
  name: string;
  comment: string;
  commentId: string;
  avatar: string;
  timestamp: number;
  state: SleuthState;
  slackUserId?: string;
  lineId?: string;
  didPost: () => void;
}

export interface CommentState {
  isPosting: boolean;
  isEditing: boolean;
  editValue: string;
}

@observer
export class Comment extends React.Component<CommentProps, Partial<CommentState>> {
  constructor(props: CommentProps) {
    super(props);

    this.state = {
      isPosting: false,
      isEditing: false,
      editValue: props.comment,
    };

    this.toggleEdit = this.toggleEdit.bind(this);
    this.submitEdit = this.submitEdit.bind(this);
    this.handleChange = this.handleChange.bind(this);
  }

  public componentWillReceiveProps(nextProps: CommentProps) {
    if (this.props.commentId !== nextProps.commentId) {
      this.setState({
        isPosting: false,
        isEditing: false,
        editValue: nextProps.comment
      });
    }
  }

  public submitEdit(e: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLElement>) {
    if (!this.props.state.selectedEntry) return;

    const { commentId, lineId } = this.props;
    const { editValue } = this.state;
    const log = this.props.state.selectedEntry.logType;

    e.preventDefault();
    if (!lineId || editValue === undefined) return;

    cooperComments.updateComment(lineId, commentId, editValue, log)
      .then(async (result) => {
        debug(`Posted a comment to cooper`, result);

        this.setState({ isPosting: false, isEditing: false, editValue: '' });
        this.props.didPost();

        debug(await result.text());
      });
  }

  public handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    this.setState({ editValue: (e.target as HTMLTextAreaElement).value });
  }

  public renderEdit() {
    const { isPosting, editValue } = this.state;
    const buttonOptions = { loading: isPosting, onClick: this.submitEdit };

    return (
      <form className='EditComment' onSubmit={this.submitEdit}>
        <textarea
          id='textarea'
          onChange={this.handleChange}
          value={editValue}
        />
        <Button type='submit' {...buttonOptions}>
          {editValue ? 'Save' : 'Delete'}
        </Button>
      </form>
    );
  }

  public toggleEdit() {
    const { isEditing } = this.state;
    const newEditValue = this.props.comment;

    this.setState({ isEditing: !isEditing, editValue: newEditValue });
  }

  public renderEditButton(): JSX.Element | null {
    const { slackUserId } = this.props;
    const { slackUserId: mySlackUserId } = this.props.state;

    if (slackUserId === mySlackUserId) {
      return (<a onClick={this.toggleEdit}>Edit</a>);
    } else {
      return null;
    }
  }

  public renderMarkdown(text: string) {
    return {
      __html : markdown.render(text)
    };
  }

  public render(): JSX.Element {
    const { name, comment, avatar, timestamp } = this.props;
    const { isEditing } = this.state;
    const time = format(timestamp, 'MMMM do y, h:mm:ss a');
    const avatarStyle = { backgroundImage: `url(${avatar})` };
    const editBtn = this.renderEditButton();

    if (!isEditing) {
      return (
        <Card className='Comment'>
          <div className='Avatar' style={avatarStyle} />
          <div className='Text'>
            <div>
              <span className='Name'>{name}</span>
              <span className='Timestamp'>{time}</span>
            </div>
            <div dangerouslySetInnerHTML={this.renderMarkdown(comment)} />
            {editBtn}
          </div>
        </Card>
      );
    } else {
      return this.renderEdit();
    }
  }
}
